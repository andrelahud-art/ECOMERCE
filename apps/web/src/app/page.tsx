import Link from "next/link";
export default function Home() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border p-8">
        <h1 className="text-3xl font-semibold">Electrónicos verificados a precio de remate</h1>
        <p className="mt-2 text-zinc-600">Compra segura, envío en 24–72h.</p>
        <div className="mt-6">
          <Link className="inline-flex rounded-xl bg-black px-5 py-3 text-white" href="/productos">
            Comprar ahora
          </Link>
        </div>
      </div>
    </section>
  );
}
