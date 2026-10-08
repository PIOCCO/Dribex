import Link from "next/link";

type Props = { params: Promise<{ slug?: string[] }> };

/**
 * Shown only when nginx does not proxy /APIO/* to apio-web (see apio-prod-deploy.sh).
 * When APIO is wired correctly, this route is never hit.
 */
export default async function ApioNginxFallbackPage({ params }: Props) {
  const { slug = [] } = await params;
  const subpath = slug.length ? slug.join("/") : "(home)";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16 font-sans text-neutral-900">
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">APIO / Espace promoteur</p>
      <h1 className="mt-2 text-2xl font-semibold">Connexion indisponible sur cette route</h1>
      <p className="mt-4 text-neutral-600">
        Vous êtes sur l&apos;application Dribex, pas sur le site APIO. Cela arrive si les routes nginx{" "}
        <code className="rounded bg-neutral-100 px-1">/APIO/</code> ne sont pas installées, ou si vous ouvrez
        l&apos;URL API au lieu de la page de connexion.
      </p>
      <p className="mt-4 text-neutral-600">
        <strong>URL correcte (navigateur) :</strong>{" "}
        <Link href="/APIO/owner/login" className="text-blue-700 underline">
          https://dribex.ma/APIO/owner/login
        </Link>
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Ne pas ouvrir <code className="rounded bg-neutral-100 px-1">/APIO/api/auth/owner/login</code> — c&apos;est
        un endpoint JSON (POST), pas une page.
      </p>
      <p className="mt-6 text-sm text-neutral-500">
        Chemin demandé (sans nginx APIO) : <code className="rounded bg-neutral-100 px-1">/APIO/{subpath}</code>
      </p>
      <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        <strong>Opérateur (piocco) :</strong>{" "}
        <code className="block whitespace-pre-wrap pt-2 text-xs">
          cd ~/MarGem/souq-local/infra/onprem{"\n"}
          ./scripts/apio-prod-status.sh{"\n"}
          ./scripts/apio-prod-deploy.sh
        </code>
      </p>
    </main>
  );
}
