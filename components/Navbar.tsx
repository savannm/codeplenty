// Navbar.tsx — The Navigation Bar Component
// ==========================================
// This component renders the menu bar that appears at the top of every page.
// It's imported and used in layout.tsx so it shows up site-wide.
//
// "Link" from Next.js works like an <a> tag but navigates between pages
// WITHOUT doing a full browser reload — much faster!
import Image from "next/image";
import Link from "next/link";
import styles from "./Navbar.module.css";


// The Navbar component. No props needed — the links are hardcoded here.
export default function Navbar() {
    return (
        // <nav> is a semantic HTML tag that tells browsers (and screen readers)
        // this section contains navigation links.                  
        <nav className={styles.navbar}>

            {/* Left side: the site logo / brand name */}
            <div className={styles.brand}>
                {/* Link to the homepage ("/") */}
                <Link href="/" className={styles.brandLink}>
                    <Image
                        className={styles.logo}
                        src="/logo-jorvann-white.png"         // Path to the image in the /public folder
                        alt="jorvann company logo"      // Alt text for accessibility (screen readers)
                        width={150}             // Display width in pixels
                        height={50}             // Display height in pixels
                        priority                // Load this image immediately (above the fold)
                    />
                </Link>
            </div>

            {/* Right side: the navigation links */}
            <ul className={styles.navLinks}>
                {/*
          Each <li> is a list item.
          Using a <ul> (unordered list) for nav links is the correct,
          accessible HTML pattern for navigation menus.
        */}
                <li>
                    <Link href="/" className={styles.link}>
                        Home
                    </Link>
                </li>
                <li className={styles.dropdown}>
                    <Link href="/Resources" className={styles.link}>
                        Resources <span className={styles.arrow}>▼</span>
                    </Link>
                    <div className={styles.dropdownContent}>
                        <Link href="/service" className={styles.dropdownItem}>
                            Agent AI
                        </Link>
                    </div>
                </li>
                <li>
                    <Link href="/contact" className={styles.link}>
                        Contact
                    </Link>
                </li>
            </ul>

        </nav >
    );
}
