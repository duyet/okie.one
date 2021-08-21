import splitbee from "@splitbee/web";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";

import * as gtag from "../lib/gtag";

import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
    const router = useRouter();

    useEffect(() => {
        // This initiliazes Splitbee.js
        splitbee.init();

        const handleRouteChange = (url: string) => {
            gtag.pageview(url);
        };
        //When the component is mounted, subscribe to router changes
        //and log those page views
        router.events.on("routeChangeComplete", handleRouteChange);

        // If the component is unmounted, unsubscribe
        // from the event with the `off` method
        return () => {
            router.events.off("routeChangeComplete", handleRouteChange);
        };
    }, [router.events]);

    return (
        <ChakraProvider>
            <Component {...pageProps} />
        </ChakraProvider>
    );
}
export default MyApp;
