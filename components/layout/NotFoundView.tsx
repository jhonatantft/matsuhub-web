import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { dict, HOME_PATH, type Lang } from "@/lib/i18n";

/** The 404 page body, in the language of the tree it renders in. */
export function NotFoundView({ lang }: { lang: Lang }) {
  const d = dict(lang).notFound;
  return (
    <section className="relative z-10 grid min-h-svh place-items-center px-[var(--pad)] py-[var(--nav-h)] text-center">
      <div>
        <Logo className="justify-center" />
        <p className="label mt-10">{d.label}</p>
        <h1 className="h-section mx-auto mt-4 max-w-[16ch]">{d.heading}</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-mute">{d.text}</p>
        <div className="mt-8 flex justify-center">
          <Button href={HOME_PATH[lang]}>{dict(lang).common.backHome}</Button>
        </div>
      </div>
    </section>
  );
}
