package com.psp.mobilebank

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.psp.mobilebank.databinding.ActivityMainBinding
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.*

// API interfejs za komunikaciju sa tvojim Core/Bank servisom
interface PspApiService {
    @POST("api/qr/simulate-pay/{id}")
    fun confirmPayment(@Path("id") transactionId: String): Call<Void>
}

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    // OBAVEZNO: Proveri port (8080 za Gateway, 8081 za Core ili 8085 za Bank)
    // 10.0.2.2 = specijalna adresa kojom Android Emulator dosegne localhost host masine.
    // Ako koristis fizicki telefon, zameni sa LAN IP-em PC-a (npr. http://192.168.1.21:8080/core/).
    private val BASE_URL = "http://10.0.2.2:8080/core/"
    private val TAG = "MobileBankDebug"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnScan.setOnClickListener {
            pokreniSkener()
        }
    }

    private fun pokreniSkener() {
        val options = ScanOptions()
        options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        options.setPrompt("Skenirajte NBS IPS QR kod")
        options.setBeepEnabled(true)
        options.setOrientationLocked(true)
        barcodeLauncher.launch(options)
    }

    private val barcodeLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents == null) {
            Log.d(TAG, "Skeniranje otkazano")
        } else {
            val scannedData = result.contents
            Log.d(TAG, "Skeniran IPS String: $scannedData")

            // --- KLJUČNA ISPRAVKA: Izvlačenje ID-a iz NBS formata ---
            // NBS format: ...|RO:134
            val transactionId = if (scannedData.contains("RO:")) {
                scannedData.substringAfter("RO:").trim()
            } else {
                scannedData // Fallback ako skeniraš čist ID
            }

            Log.d(TAG, "Izvučen ID za slanje: $transactionId")
            binding.tvStatus.text = "Slanje potvrde za ID: $transactionId"

            posaljiPotvrduBackendu(transactionId)
        }
    }

    private fun posaljiPotvrduBackendu(id: String) {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(PspApiService::class.java)

        apiService.confirmPayment(id).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                Log.d(TAG, "Server odgovor: ${response.code()}")

                if (response.isSuccessful) {
                    // Scenario: Iznos < 20.000 RSD
                    binding.tvStatus.text = "✅ USPEŠNO PLAĆENO!"
                    Toast.makeText(this@MainActivity, "Transakcija $id uspešna!", Toast.LENGTH_LONG).show()
                } else {
                    // Scenario: Iznos > 20.000 RSD (Vraća 400 Bad Request)
                    val errorMsg = if (response.code() == 400) "Limit prekoračen!" else "ID nije pronađen!"
                    binding.tvStatus.text = "❌ ODBIJENO: $errorMsg"
                    Log.e(TAG, "Greška servera: ${response.code()}")
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                // Scenario: Server nije dostupan ili loš IP
                Log.e(TAG, "Mrežna greška: ${t.message}")
                binding.tvStatus.text = "❌ MREŽA: Proverite IP adresu i WiFi"
            }
        })
    }
}