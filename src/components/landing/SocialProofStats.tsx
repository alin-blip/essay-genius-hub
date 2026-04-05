import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 7000, suffix: "+", label: "Students Helped" },
  { value: 25000, suffix: "+", label: "Assignments Generated" },
  { value: 98, suffix: "%", label: "Satisfaction Rate" },
  { value: 150, suffix: "+", label: "UK Universities" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const SocialProofStats = () => (
  <section className="py-16 bg-primary">
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="text-center space-y-2">
            <div className="text-3xl md:text-4xl font-bold text-accent">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <p className="text-sm text-primary-foreground/70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProofStats;
