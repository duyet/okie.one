import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Subscribe from "../components/Subscribe";
import * as gtag from "../lib/gtag";

const Home: NextPage = () => {
    const onPostSubmit = (email: string) => {
        gtag.event({
            action: "submit_subscribe",
            params: {
                email: Buffer.from(email).toString("base64"),
            },
        });
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Okie.one</title>
                <meta name="description" content="Create the best content from your favorite site" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <div>
                    <h1 className={styles.title}>
                        Okie<span>.one</span>
                    </h1>

                    <p className={styles.description}>Create the best content from your favorite site!</p>
                </div>

                <div className={styles.subscription}>
                    <Subscribe onPostSubmit={onPostSubmit} />
                </div>
            </main>
        </div>
    );
};

export default Home;
