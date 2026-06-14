import { HugeiconsIcon } from "@hugeicons/react";
import {
  FootballIcon,
  ChampionIcon,
  Leaf01Icon,
  FireIcon,
  UnavailableIcon,
  Tick02Icon,
  Cancel01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Coins01Icon,
  ChartIncreaseIcon,
  HelpCircleIcon,
  SparklesIcon,
  Copy01Icon,
  TelegramIcon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";

export const Icons = {
  trophy: ChampionIcon,
  football: FootballIcon,
  leaf: Leaf01Icon,
  fire: FireIcon,
  ban: UnavailableIcon,
  check: Tick02Icon,
  close: Cancel01Icon,
  up: ArrowUp01Icon,
  down: ArrowDown01Icon,
  left: ArrowLeft01Icon,
  right: ArrowRight01Icon,
  upRight: ArrowUpRight01Icon,
  coins: Coins01Icon,
  chart: ChartIncreaseIcon,
  help: HelpCircleIcon,
  sparkles: SparklesIcon,
  copy: Copy01Icon,
  telegram: TelegramIcon,
  x: NewTwitterIcon,
} as const;

export type IconName = keyof typeof Icons;

// Thin wrapper over HugeiconsIcon. Inherits color via currentColor; size in px.
export function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={Icons[name]}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
