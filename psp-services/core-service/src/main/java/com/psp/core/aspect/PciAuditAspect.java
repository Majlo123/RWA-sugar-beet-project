package com.psp.core.aspect;

import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.security.PanMasker;
import com.psp.core.service.AuditService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * PCI DSS 10.2 - AOP Aspect za automatsko audit logovanje
 */
@Aspect
@Component
public class PciAuditAspect {

    private final AuditService auditService;

    public PciAuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    /**
     * Pointcut za sve metode u kontrolerima
     */
    @Pointcut("within(com.psp.core.controller..*)")
    public void controllerMethods() {}

    /**
     * Pointcut za sve metode koje rukuju plaćanjima
     */
    @Pointcut("execution(* com.psp.core.service.*Service.*(..))")
    public void serviceMethods() {}

    /**
     * Pointcut za metode koje pristupaju transakcijama
     */
    @Pointcut("execution(* com.psp.core.service.TransactionService.*(..)) || " +
              "execution(* com.psp.core.controller.TransactionController.*(..))")
    public void transactionMethods() {}

    /**
     * Pointcut za merchant operacije
     */
    @Pointcut("execution(* com.psp.core.service.MerchantService.*(..)) || " +
              "execution(* com.psp.core.controller.MerchantController.*(..))")
    public void merchantMethods() {}

    /**
     * Automatsko logovanje svih merchant operacija
     */
    @Around("merchantMethods()")
    public Object auditMerchantOperations(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String args = sanitizeArguments(joinPoint.getArgs());
        
        AuditActionType actionType = determineActionType(methodName, "MERCHANT");
        String actor = extractActor(joinPoint.getArgs());
        
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            String resourceId = extractResourceId(result, joinPoint.getArgs());
            auditService.log(actionType, actor, resourceId, "MERCHANT", 
                AuditOutcome.SUCCESS, String.format("Method: %s, Duration: %dms", methodName, duration));
            
            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            auditService.log(actionType, actor, null, "MERCHANT", 
                AuditOutcome.FAILURE, String.format("Method: %s, Error: %s, Duration: %dms", 
                    methodName, e.getMessage(), duration));
            throw e;
        }
    }

    /**
     * Automatsko logovanje svih transaction operacija
     */
    @Around("transactionMethods()")
    public Object auditTransactionOperations(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        
        AuditActionType actionType = determineActionType(methodName, "TRANSACTION");
        String actor = extractActor(joinPoint.getArgs());
        
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            String resourceId = extractResourceId(result, joinPoint.getArgs());
            auditService.log(actionType, actor, resourceId, "TRANSACTION", 
                AuditOutcome.SUCCESS, String.format("Method: %s, Duration: %dms", methodName, duration));
            
            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            auditService.log(actionType, actor, null, "TRANSACTION", 
                AuditOutcome.FAILURE, String.format("Method: %s, Error: %s, Duration: %dms", 
                    methodName, e.getMessage(), duration));
            throw e;
        }
    }

    /**
     * Određuje tip akcije na osnovu imena metode
     */
    private AuditActionType determineActionType(String methodName, String domain) {
        String lowerMethod = methodName.toLowerCase();
        
        if (domain.equals("MERCHANT")) {
            if (lowerMethod.contains("register") || lowerMethod.contains("create")) {
                return AuditActionType.MERCHANT_REGISTERED;
            } else if (lowerMethod.contains("update") || lowerMethod.contains("subscription")) {
                return AuditActionType.MERCHANT_SUBSCRIPTION_CHANGED;
            } else if (lowerMethod.contains("get") || lowerMethod.contains("find")) {
                return AuditActionType.MERCHANT_VIEWED;
            } else if (lowerMethod.contains("delete")) {
                return AuditActionType.MERCHANT_DELETED;
            }
            return AuditActionType.MERCHANT_UPDATED;
        }
        
        if (domain.equals("TRANSACTION")) {
            if (lowerMethod.contains("create") || lowerMethod.contains("initiate")) {
                return AuditActionType.TRANSACTION_CREATED;
            } else if (lowerMethod.contains("status")) {
                return AuditActionType.TRANSACTION_STATUS_CHANGED;
            } else if (lowerMethod.contains("get") || lowerMethod.contains("find")) {
                return AuditActionType.TRANSACTION_VIEWED;
            } else if (lowerMethod.contains("search")) {
                return AuditActionType.TRANSACTION_SEARCH;
            }
            return AuditActionType.TRANSACTION_UPDATED;
        }
        
        return AuditActionType.CARD_DATA_ACCESS;
    }

    /**
     * Sanitizuje argumente da ne sadrže osetljive podatke
     */
    private String sanitizeArguments(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }
        
        return Arrays.stream(args)
            .map(arg -> {
                if (arg == null) return "null";
                String str = arg.toString();
                // Maskira sve PAN brojeve
                return PanMasker.maskAllInText(str);
            })
            .collect(Collectors.joining(", ", "[", "]"));
    }

    /**
     * Ekstrahuje actor (merchant ID) iz argumenata
     */
    private String extractActor(Object[] args) {
        if (args == null) return "SYSTEM";
        
        for (Object arg : args) {
            if (arg instanceof String) {
                String str = (String) arg;
                // Ako izgleda kao merchant ID
                if (str.matches("[a-zA-Z0-9\\-_]{3,50}")) {
                    return str;
                }
            }
        }
        return "SYSTEM";
    }

    /**
     * Ekstrahuje resource ID iz rezultata ili argumenata
     */
    private String extractResourceId(Object result, Object[] args) {
        // Pokušaj iz rezultata
        if (result != null) {
            try {
                var idMethod = result.getClass().getMethod("getId");
                Object id = idMethod.invoke(result);
                if (id != null) return id.toString();
            } catch (Exception ignored) {}
            
            try {
                var merchantIdMethod = result.getClass().getMethod("getMerchantId");
                Object id = merchantIdMethod.invoke(result);
                if (id != null) return id.toString();
            } catch (Exception ignored) {}
        }
        
        // Pokušaj iz argumenata
        if (args != null && args.length > 0) {
            if (args[0] instanceof String) return (String) args[0];
            if (args[0] instanceof Long) return args[0].toString();
        }
        
        return null;
    }
}
