export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-slate-100 pb-16 print:bg-white print:pb-0">{children}</div>;
}
