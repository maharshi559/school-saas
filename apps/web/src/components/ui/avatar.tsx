export const Avatar = ({ initials, name, className = "h-8 w-8" }: { initials: string; name?: string; className?: string }) => {
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-sm font-medium text-white flex-shrink-0`} title={name}>
      {initials}
    </div>
  );
};
