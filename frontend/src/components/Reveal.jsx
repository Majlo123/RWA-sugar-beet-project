import { useEffect, useRef, useState } from 'react';

/**
 * Reveal — fades/slides children in once they scroll into view.
 * Pairs with the [data-reveal] / .reveal-visible CSS in index.css.
 * Purely presentational; respects prefers-reduced-motion via CSS.
 */
function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const Tag = as;
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={`${visible ? 'reveal-visible ' : ''}${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
