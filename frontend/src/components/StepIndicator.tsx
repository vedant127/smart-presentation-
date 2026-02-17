import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="hidden sm:block">
                <div className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("h-px w-8 lg:w-12", isCompleted ? "bg-accent" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
