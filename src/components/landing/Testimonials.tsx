import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sophie R.",
    university: "University of Manchester",
    course: "BSc Business Management",
    text: "I was struggling with my marketing assignment and had 48 hours left. AssignmentPro generated a perfectly structured 3,000-word essay with proper Harvard references. Got a 68% — my best mark this year!",
    grade: "2:1",
    initials: "SR",
  },
  {
    name: "James K.",
    university: "University of Birmingham",
    course: "MSc Finance",
    text: "The humanization feature is incredible. My tutor had no idea it was AI-assisted. The academic tone and critical analysis were exactly what's expected at Level 7. Absolute lifesaver during dissertation season.",
    grade: "Distinction",
    initials: "JK",
  },
  {
    name: "Amira T.",
    university: "Leeds Beckett University",
    course: "HND Health & Social Care",
    text: "I work full-time and study part-time. AssignmentPro helps me keep up with coursework without sacrificing quality. The case study integration feature is spot on for my course.",
    grade: "Merit",
    initials: "AT",
  },
  {
    name: "Daniel P.",
    university: "University of Nottingham",
    course: "BSc Computer Science",
    text: "Used it for my research methods module. The referencing was flawless and the structure followed our marking rubric perfectly. Went from averaging 55% to consistently hitting 65%+.",
    grade: "2:1",
    initials: "DP",
  },
];

const Testimonials = () => (
  <section className="py-20 md:py-28 bg-secondary/30">
    <div className="container">
      <div className="text-center mb-16 space-y-4">
        <p className="text-accent font-semibold text-sm uppercase tracking-wider">
          Student Reviews
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-primary">
          Loved by Students Across the UK
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          See what students from top UK universities are saying about AssignmentPro.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <Card
            key={i}
            className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card"
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-accent text-accent"
                  />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed italic">
                "{t.text}"
              </p>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.university}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                  {t.grade}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
