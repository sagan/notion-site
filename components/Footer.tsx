import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaEnvelopeOpenText } from "@react-icons/all-files/fa/FaEnvelopeOpenText";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { FaLinkedin } from "@react-icons/all-files/fa/FaLinkedin";
import { FaMastodon } from "@react-icons/all-files/fa/FaMastodon";
import { FaTwitter } from "@react-icons/all-files/fa/FaTwitter";
import { FaYoutube } from "@react-icons/all-files/fa/FaYoutube";
import { FaZhihu } from "@react-icons/all-files/fa/FaZhihu";
import { IoMoonSharp } from "@react-icons/all-files/io5/IoMoonSharp";
import { IoSunnyOutline } from "@react-icons/all-files/io5/IoSunnyOutline";
import { IoRefreshOutline } from "@react-icons/all-files/io5/IoRefreshOutline";
import { IoSettingsOutline } from "@react-icons/all-files/io5/IoSettingsOutline";
import { getMastodonHandle } from "@/lib/public-config";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useSiteConfig } from "./SiteConfigContext";
import styles from "./styles.module.css";

// TODO: merge the data and icons from PageSocial with the social links in Footer

export function FooterImpl() {
  const config = useSiteConfig();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const pathname = usePathname() || "/";
  const currentYear = new Date().getFullYear();

  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {}
  const refreshHref = `/$admin/?tab=cache&target=${encodeURIComponent(decodedPath)}`;

  const onToggleDarkMode = React.useCallback(
    (e) => {
      e.preventDefault();
      toggleDarkMode();
    },
    [toggleDarkMode],
  );

  return (
    <footer className={styles.footer}>
      <div className={styles.copyright}>
        &copy; {currentYear} {config.author}
      </div>

      {config.privacyPolicy && (
        <a
          className={styles.copyright}
          href={config.privacyPolicy}
          title="Privacy Policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
      )}

      <div className={styles.social}>
        <Link href="/$admin/" prefetch={false} title="Admin">
          <IoSettingsOutline />
        </Link>
        <Link href={refreshHref} prefetch={false} title="Refresh Page Cache">
          <IoRefreshOutline />
        </Link>

        {!!config.twitter && (
          <a
            className={styles.twitter}
            href={`https://twitter.com/${config.twitter}`}
            title={`Twitter @${config.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaTwitter />
          </a>
        )}

        {!!config.mastodon && (
          <a
            className={styles.mastodon}
            href={config.mastodon}
            title={`Mastodon ${getMastodonHandle(config.mastodon)}`}
            rel="me"
          >
            <FaMastodon />
          </a>
        )}

        {!!config.zhihu && (
          <a
            className={styles.zhihu}
            href={`https://zhihu.com/people/${config.zhihu}`}
            title={`Zhihu @${config.zhihu}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaZhihu />
          </a>
        )}

        {!!config.github && (
          <a
            className={styles.github}
            href={`https://github.com/${config.github}`}
            title={`GitHub @${config.github}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
          </a>
        )}

        {!!config.linkedin && (
          <a
            className={styles.linkedin}
            href={`https://www.linkedin.com/in/${config.linkedin}`}
            title={`LinkedIn ${config.author}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>
        )}

        {!!config.newsletter && (
          <a
            className={styles.newsletter}
            href={`${config.newsletter}`}
            title={`Newsletter ${config.author}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaEnvelopeOpenText />
          </a>
        )}

        {!!config.youtube && (
          <a
            className={styles.youtube}
            href={`https://www.youtube.com/${config.youtube}`}
            title={`YouTube ${config.author}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaYoutube />
          </a>
        )}
        <a
          className={`${styles.toggleDarkMode} ${styles.last} toggle-dark`}
          role="button"
          onClick={onToggleDarkMode}
          title="Toggle dark mode"
        >
          <IoMoonSharp />
        </a>
        <a
          className={`${styles.toggleDarkMode} ${styles.last} toggle-light`}
          role="button"
          onClick={onToggleDarkMode}
          title="Toggle dark mode"
        >
          <IoSunnyOutline />
        </a>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterImpl);
