export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-muted/40 flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
