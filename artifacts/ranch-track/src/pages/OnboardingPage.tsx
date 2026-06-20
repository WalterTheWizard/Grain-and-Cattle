import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetFarmType, getGetMeQueryKey } from "@workspace/api-client-react";
import { Beef, Sprout, Layers } from "lucide-react";

const OPTIONS = [
  {
    value: "cattle" as const,
    icon: Beef,
    title: "Livestock Only",
    description: "Track cattle, farm tasks, fields, time cards, and employees.",
    accent: "hsl(142 71% 45%)",
    bg: "hsl(142 71% 97%)",
    border: "hsl(142 71% 80%)",
  },
  {
    value: "grain" as const,
    icon: Sprout,
    title: "Grain Only",
    description: "Manage crops, grain storage, equipment, and inputs.",
    accent: "hsl(45 93% 47%)",
    bg: "hsl(45 93% 97%)",
    border: "hsl(45 93% 75%)",
  },
  {
    value: "both" as const,
    icon: Layers,
    title: "Livestock & Grain",
    description: "Full access — cattle records plus complete grain operations.",
    accent: "hsl(220 83% 53%)",
    bg: "hsl(220 83% 97%)",
    border: "hsl(220 83% 78%)",
  },
];

interface OnboardingPageProps {
  farmName: string;
}

export default function OnboardingPage({ farmName }: OnboardingPageProps) {
  const [selected, setSelected] = useState<"cattle" | "grain" | "both" | null>(null);
  const queryClient = useQueryClient();

  const setFarmType = useSetFarmType({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
    },
  });

  function handleConfirm() {
    if (!selected) return;
    setFarmType.mutate({ data: { farmType: selected } });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="hsl(142 71% 45%)" />
              <path d="M18 8 C12 8 8 12 8 18 C8 22 10 25 13 27 C14 27.5 15 26.5 14.5 25.5 C13 23.5 12 21 12 18 C12 14 14.8 11 18 11 C21.2 11 24 14 24 18 C24 20.5 23 22.8 21.5 24.3 C20.7 25.1 21.3 26.5 22.5 26.5 C24 26.5 26 24 27 22 C27.7 20.7 28 19.4 28 18 C28 12 23.5 8 18 8Z" fill="white" />
              <path d="M18 13 C15.2 13 13 15.2 13 18 C13 19.6 13.7 21 14.8 22 C15.5 22.7 16.5 22 16.2 21 C16 20.4 15.9 19.7 15.9 19 C15.9 16.8 16.8 15 18 15 C19.2 15 20.1 16.8 20.1 19 C20.1 20.4 19.6 21.6 18.8 22.3 C18 23 18.5 24.2 19.6 24 C21.5 23.5 23 21 23 18 C23 15.2 20.8 13 18 13Z" fill="white" opacity="0.8" />
              <circle cx="18" cy="18" r="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome to {farmName}!</h1>
          <p className="text-muted-foreground text-sm">
            What kind of operation do you run? We'll set up your workspace accordingly.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-[var(--opt-accent)] shadow-md scale-[1.02]"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
                style={
                  isSelected
                    ? ({
                        "--opt-accent": opt.accent,
                        background: opt.bg,
                        borderColor: opt.border,
                      } as React.CSSProperties)
                    : {}
                }
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: opt.accent }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: isSelected ? opt.accent : "hsl(240 5% 96%)" }}
                >
                  <Icon size={22} color={isSelected ? "white" : "hsl(240 4% 46%)"} />
                </div>
                <h2 className="font-semibold text-sm text-foreground mb-1">{opt.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
              </button>
            );
          })}
        </div>

        {/* Confirm */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selected || setFarmType.isPending}
            className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {setFarmType.isPending ? "Setting up…" : "Get Started"}
          </button>
        </div>

        {setFarmType.isError && (
          <p className="text-center text-xs text-destructive mt-3">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
