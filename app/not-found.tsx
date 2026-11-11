import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="relative z-10 grid min-h-svh place-items-center px-[var(--pad)] text-center">
      <div>
        <Logo className="justify-center" />
        <p className="label mt-10">Erro 404</p>
        <h1 className="h-section mx-auto mt-4 max-w-[16ch]">Esta página se perdeu no hub.</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-mute">O endereço não existe ou mudou de lugar.</p>
        <div className="mt-8 flex justify-center">
          <Button href="/">Voltar ao início</Button>
        </div>
      </div>
    </main>
  );
}
