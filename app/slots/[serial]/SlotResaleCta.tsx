import { ButtonLink } from "@/components/ui/ButtonLink";

export function SlotResaleCta({ serial }: { serial: number }) {
  return (
    <ButtonLink
      href={`/resale/${serial}`}
      variant="primary"
      className="no-underline"
    >
      Sell pass
    </ButtonLink>
  );
}
