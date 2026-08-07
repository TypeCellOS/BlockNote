import { useState } from "react";

function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="hamburger">
      <button
        type="button"
        className="hamburger-button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <nav className="hamburger-menu">
          <a href="#">Home</a>
          <a href="#">Documents</a>
          <a href="#">Shared with me</a>
          <a href="#">Settings</a>
        </nav>
      )}
    </div>
  );
}

export function NavBar() {
  return (
    <header className="top-nav">
      <HamburgerMenu />
      <span className="top-nav-title">Lorem Ipsum</span>
    </header>
  );
}

/** A block of static page text, to sit around the editor. */
export function StaticText() {
  return (
    <section className="prose">
      <h2>Lorem Ipsum</h2>
      <p>
        Elit ipsum qui deserunt deserunt. Qui labore eu esse veniam excepteur.
        Aute ipsum qui dolore in ipsum commodo adipisicing velit. Qui
        consectetur et cupidatat consectetur sunt anim excepteur reprehenderit
        sunt quis magna aliqua laborum. Lorem irure est ipsum ea nisi incididunt
        culpa qui consequat eiusmod deserunt ipsum nostrud velit laboris.
      </p>
      <p>
        Culpa quis id ipsum enim proident dolore non. Ad occaecat nostrud
        eiusmod pariatur occaecat nisi voluptate nulla. Nisi quis ut esse ex
        reprehenderit Lorem tempor ex tempor id sit officia. Commodo sunt sint
        aliqua quis reprehenderit. Occaecat id ad dolor officia qui sunt dolor.
        Consectetur magna excepteur in minim pariatur qui elit in sit consequat
        aliquip voluptate laboris. Reprehenderit et eu dolor ex cupidatat aliqua
        in elit anim eiusmod et adipisicing. Cupidatat fugiat fugiat amet duis.
      </p>
      <p>
        Voluptate quis dolor ipsum commodo fugiat sit tempor tempor non aliqua
        qui. Veniam consectetur mollit consequat exercitation sit ad. Lorem amet
        deserunt qui sint et. Sint aute cillum aliqua pariatur cillum id.
        Consectetur proident Lorem qui laborum id in sit. Aute aute irure nisi
        est veniam Lorem. Anim labore irure ut sit mollit velit et duis veniam
        ipsum aliquip.
      </p>
      <p>
        Occaecat dolore excepteur qui proident laborum. Dolor deserunt cillum
        veniam nulla minim eu in est aute nulla anim incididunt ea. Anim aliquip
        aute duis aliqua eu pariatur est dolor magna Lorem dolore do sunt
        aliquip est. Laborum pariatur fugiat do reprehenderit tempor cupidatat
        proident ipsum ad dolor laboris.
      </p>
    </section>
  );
}
