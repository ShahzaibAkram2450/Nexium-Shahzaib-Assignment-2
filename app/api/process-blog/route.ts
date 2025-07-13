import { type NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

// Your existing helper functions remain the same
function generateSummary(content: string): string {
  const sentences = content.match(/[^.!?\n]+[.!?]?/g) || [];
  const uniqueSentences = Array.from(
    new Set(sentences.map((s) => s.trim()))
  ).filter(
    (s) =>
      s.length > 30 &&
      !s.match(
        /placeholder|no-script|Business Insider tells the innovative stories you want to know/i
      )
  );
  return uniqueSentences.slice(0, 3).join(" ") || "";
}

const translationDict: Record<string, string> = {
  // Your existing translation dictionary
  the: "یہ",
  is: "ہے",
  // ... rest of your dictionary
};

function translateToUrdu(text: string): string {
  return text.replace(/\w+/g, (word) => {
    const cleanWord = word.toLowerCase();
    return translationDict[cleanWord] || word;
  });
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  $(
    "script, style, nav, header, footer, aside, img, .no-script, .placeholder"
  ).remove();

  const contentSelectors = [
    "article",
    ".post-content",
    ".entry-content",
    ".content",
    "main",
    ".main-content",
    "#content",
    ".post-body",
  ];

  let content = "";
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }

  if (!content) {
    content = $("body").text();
  }

  const lines = content
    .replace(/\s+/g, " ")
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.match(
          /placeholder|no-script|Business Insider tells the innovative stories you want to know/i
        )
    );

  const uniqueLines = Array.from(new Set(lines));
  return uniqueLines.join(" ");
}

function calculateReadTime(wordCount: number): number {
  const averageWPM = 200;
  return Math.ceil(wordCount / averageWPM);
}

// Add proper CORS headers helper
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    console.log(`Processing URL: ${url}`);

    // Fetch the webpage with better error handling
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
      timeout: 15000, // Increased timeout
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract title with better fallbacks
    const title =
      $("title").text().trim() ||
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "Untitled Article";

    // Extract main content
    const content = extractTextFromHtml(html);

    if (!content || content.length < 100) {
      return NextResponse.json(
        { error: "Could not extract sufficient content from the webpage" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Generate summary
    const summary = generateSummary(content);

    if (!summary) {
      return NextResponse.json(
        { error: "Could not generate summary from the content" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Translate to Urdu
    const urduSummary = translateToUrdu(summary);

    // Calculate metrics
    const wordCount = content.split(/\s+/).length;
    const readTime = calculateReadTime(wordCount);

    const processedBlog = {
      url,
      title: title.substring(0, 200), // Limit title length
      content: content.substring(0, 5000), // Limit content length for response
      summary,
      urduSummary,
      wordCount,
      readTime,
    };

    console.log(`Successfully processed: ${title}`);

    return NextResponse.json(processedBlog, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.error("Error processing blog:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: "Could not connect to the website. Please check the URL." },
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: "The webpage was not found (404)." },
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }

      if (error.response?.status === 403) {
        return NextResponse.json(
          {
            error:
              "Access forbidden. The website may be blocking automated requests.",
          },
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }

      if (error.code === "ECONNABORTED") {
        return NextResponse.json(
          { error: "Request timeout. The website took too long to respond." },
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process the blog. Please try again." },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}
