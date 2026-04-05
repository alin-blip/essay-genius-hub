const universities = [
  "University of Manchester",
  "University of Birmingham",
  "Leeds Beckett",
  "Nottingham Trent",
  "University of Leeds",
  "Cardiff University",
  "University of Bristol",
  "King's College London",
];

const UniversityLogos = () => (
  <section className="py-12 border-b">
    <div className="container">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8">
        Trusted by students at leading UK universities
      </p>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
        {universities.map((uni, i) => (
          <span
            key={i}
            className="text-sm font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors whitespace-nowrap"
          >
            {uni}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default UniversityLogos;
