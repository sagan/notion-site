import React from "react";
import styles from "./styles.module.css";
import Link from "next/link";

export function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <>
      <title>Error</title>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Error Loading Page</h1>
          <p>
            <Link href="/">Back to home</Link>
          </p>
          {statusCode && <p>Error code: {statusCode}</p>}
          <img src="/error.png" alt="Error" className={styles.errorImage} />
        </main>
      </div>
    </>
  );
}
