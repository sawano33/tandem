import {
  Baby, Banknote, Bike, BookOpen, Briefcase, Building2, Bus, Camera, Car, Cat, Coffee, CreditCard, Dog,
  Droplet, Dumbbell, Ellipsis, Fish, Flame, Fuel, Gamepad2, Gift, GraduationCap, Hammer, Heart, HeartPulse,
  House, Landmark, Leaf, Music, PartyPopper, PawPrint, PiggyBank, Pill, Pizza, Plane, Repeat, RotateCcw,
  Scissors, Shield, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sofa, Sparkles, Star, Stethoscope, Tag,
  Target, Train, Tv, Users, Utensils, Wallet, Wifi, Wrench, Zap, User, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart, utensils: Utensils, house: House, car: Car, "paw-print": PawPrint,
  baby: Baby, "heart-pulse": HeartPulse, "shopping-bag": ShoppingBag, "party-popper": PartyPopper,
  repeat: Repeat, landmark: Landmark, ellipsis: Ellipsis, briefcase: Briefcase, "rotate-ccw": RotateCcw,
  sparkles: Sparkles, wallet: Wallet, users: Users, user: User, banknote: Banknote, "piggy-bank": PiggyBank,
  target: Target, tag: Tag, "credit-card": CreditCard, "building-2": Building2, plane: Plane, gift: Gift,
  zap: Zap, droplet: Droplet, shield: Shield, wifi: Wifi, smartphone: Smartphone, tv: Tv, music: Music,
  dumbbell: Dumbbell, "graduation-cap": GraduationCap, fuel: Fuel, train: Train, bus: Bus, bike: Bike,
  coffee: Coffee, pizza: Pizza, shirt: Shirt, scissors: Scissors, stethoscope: Stethoscope, pill: Pill,
  dog: Dog, cat: Cat, fish: Fish, flame: Flame, "gamepad-2": Gamepad2, "book-open": BookOpen,
  sofa: Sofa, hammer: Hammer, wrench: Wrench, leaf: Leaf, heart: Heart, star: Star, camera: Camera,
};

export const ICON_NAMES = Object.keys(ICONS);

export const PALETTE = [
  "#FFAE97", "#FF8A70", "#FFD0BF", "#F3A9C8", "#E87F95", "#F4EFF8", "#E1D6FB",
  "#C5B6F2", "#B49CF0", "#9583E0", "#7563C4", "#8E84AE", "#6A5F92", "#8FDCB8",
];

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: {
  name: string; size?: number; className?: string; strokeWidth?: number;
}) {
  const C = ICONS[name] ?? Tag;
  return <C size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}

/** Pastille ronde colorée contenant une icône */
export function IconBubble({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `${color}26`, color }}
    >
      <Icon name={name} size={Math.round(size * 0.48)} />
    </span>
  );
}
