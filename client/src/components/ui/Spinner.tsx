export default function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-300 border-t-transparent dark:border-slate-700"
      style={{ width: size, height: size }}
    />
  );
}

