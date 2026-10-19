import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label="Alliance pour le GIECo et IME Conseil, accueil"
      >
        <Image
          className="partner-logo alliance-logo"
          src="/alliance-pour-le-gieco.png"
          alt="Alliance pour le GIECo"
          width={287}
          height={84}
          unoptimized
        />
        <Image
          className="partner-logo ime-logo"
          src="/ime-conseil.png"
          alt="IME Conseil"
          width={202}
          height={56}
          unoptimized
        />
      </Link>
      <span className="header-divider" />
      <span className="header-label">ENQUÊTE DIRIGEANTS</span>
      <Link className="header-link" href="/a-propos">
        À propos de l’enquête <ArrowUpRight size={15} />
      </Link>
      <span className="access-badge">
        <span /> Accès libre
      </span>
    </header>
  );
}
