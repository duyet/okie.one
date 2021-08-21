import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import {
  TitleInputPropertyValue,
  EmailPropertyValue,
} from "@notionhq/client/build/src/api-types";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: `${req.method} requests are not allowed` });
  }

  if (!process.env.NOTION_DATABASE_ID) {
    return res.status(500).json({ message: `Server config error` });
  }

  try {
    const { name, email } = <{ name: string; email: string }>(
      JSON.parse(req.body)
    );

    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: {
        Name: {
          title: [{ type: "text", text: { content: name || email } }],
        } as TitleInputPropertyValue,
        Email: {
          email,
        } as EmailPropertyValue,
      },
    });

    res.status(201).json({ message: "Success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "There was an error" });
  }
}
