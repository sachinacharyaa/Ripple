import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `gum-nav__link${isActive ? " gum-nav__link--active" : ""}`;

export function DashboardSidebar() {
  return (
    <aside className="gum-sidebar">
      <div className="gum-sidebar__logo">ripple</div>
      <nav className="gum-nav">
        <NavLink to="/dashboard/home" className={linkClass} end>
          <span className="gum-nav__ico" aria-hidden>
            ⌂
          </span>
          Home
        </NavLink>
        <NavLink to="/dashboard/products" className={linkClass}>
          <span className="gum-nav__ico" aria-hidden>
            ▢
          </span>
          Products
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <span className="gum-nav__ico" aria-hidden>
            $
          </span>
          Sales
        </NavLink>
      </nav>
      <div className="gum-sidebar__divider" />
      <nav className="gum-nav gum-nav--secondary">
        <a href="/#marketplace" className="gum-nav__link">
          <span className="gum-nav__ico" aria-hidden>
            ◎
          </span>
          Discover
        </a>
        <NavLink to="/history" className={linkClass}>
          <span className="gum-nav__ico" aria-hidden>
            📚
          </span>
          Library
        </NavLink>
      </nav>
    </aside>
  );
}
