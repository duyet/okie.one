// log the pageview with their URL
export const pageview = (url: string) => {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "undefined") return;

  window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || "", {
    page_path: url,
  });
};

interface IEventParams {
  action: any;
  params: any;
}

// log specific events happening.
export const event = ({ action, params }: IEventParams) => {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", action, params);
};
