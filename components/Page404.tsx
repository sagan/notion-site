import React from "react";
import Link from "next/link";
import Head from "next/head";
import * as types from "@/lib/types";
import styles from "./styles.module.css";

// not-found does not support Metadata yet.
export function Page404({ site, pageId, error }: types.PageProps) {
  const title = site?.name || "Page Not Found";
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className={styles.container} style={{ position: "static" }}>
        <main className={styles.main}>
          <h1>
            <Link className="notion-link" href="/">
              {site?.name || "Back To Home"}
            </Link>
          </h1>
          <p>Page Not Found</p>
          {error ? (
            <p>{error.message}</p>
          ) : (
            pageId && <p>Make sure that Notion page &quot;{pageId}&quot; is publicly accessible.</p>
          )}

          <img src="/404.png" alt="404 Not Found" className={styles.errorImage} />
        </main>
      </div>
    </>
  );
}
