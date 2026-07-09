import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type SearchValue = string | string[] | undefined;
function first(v: SearchValue) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const query = await searchParams;
  const uid = first(query.uid) ?? null;
  const token = first(query.token) ?? null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_#ecfeff_0%,_#f8fafc_45%,_#eef2ff_100%)] px-4 py-10">
      <div className="absolute inset-0 surface-grid opacity-60" />
      <div className="relative w-full max-w-md">
        <ResetPasswordForm uid={uid} token={token} />
      </div>
    </main>
  );
}
