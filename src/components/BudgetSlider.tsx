import { Slider } from "@/components/ui/slider";

interface BudgetSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const BudgetSlider = ({ min, max, value, onChange }: BudgetSliderProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Min Budget</p>
          <p className="text-2xl font-bold text-primary animate-fade-in">
            {formatCurrency(value[0])}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Max Budget</p>
          <p className="text-2xl font-bold text-primary animate-fade-in">
            {formatCurrency(value[1])}
          </p>
        </div>
      </div>

      <Slider
        min={min}
        max={max}
        step={100}
        value={value}
        onValueChange={onChange}
        className="py-4"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(min)}</span>
        <span>{formatCurrency(max)}</span>
      </div>
    </div>
  );
};
