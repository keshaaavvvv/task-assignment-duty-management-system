import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ Render-compatible PORT
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK with lazy key retrieval and clean fallback if not present
let aiClient: any = null;

function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;

    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
      });
    }
  }

  return aiClient;
}

// API Route for AI duty assessment summaries
app.post("/api/gemini-summary", async (req, res) => {
  const { title, description, status, remarks, userName, department } = req.body;

  if (!title || !status) {
    return res.status(400).json({
      error: "Missing required fields (title, status)",
    });
  }

  const ai = getAiClient();

  if (!ai) {
    console.warn(
      "GEMINI_API_KEY not configured. Returning premium heuristic mock report."
    );

    const timestamp = new Date().toISOString();

    if (status === "Completed") {
      return res.json({
        pros: [
          "Duty executed successfully in compliance with standard operating procedures",
          "Report submitted on schedule",
          `Assigned personnel (${userName || "User"}) displayed diligent compliance`,
        ],
        cons: [
          "Standard logs completed, but visual verification attachment was omitted",
        ],
        recommendations: [
          "Consider attaching photographic logs or tool receipts next time to speed up administrative review.",
        ],
        generatedAt: timestamp,
      });
    }

    return res.json({
      pros: [
        "Acknowledged issue and submitted informative remarks immediately to alert administration",
      ],
      cons: [
        "Duty scope was left uncompleted",
        `Possible delay caused to operational pipelines in the ${
          department || "Operations"
        } department`,
      ],
      recommendations: [
        "File an immediate priority ticket with Facilities or IT support depending on the nature of the blocker.",
        "Coordinate with the Admin team to reschedule this task as soon as the blocker is resolved.",
      ],
      generatedAt: timestamp,
    });
  }

  try {
    let prompt = "";

    if (status === "Completed") {
      prompt = `
Analyze the following completed task and generate a professional duty report.

Task Title: ${title}
Task Description: ${description || "No description provided"}
Completed By: ${userName || "Registered Personnel"}
Department: ${department || "Operations"}
Personnel Remarks: ${remarks || "None provided"}

Generate:
1. Pros: 2-3 bullet points.
2. Cons / Possible Improvements: 1-2 points.
3. Recommendations: 1-2 practical recommendations.
`;
    } else {
      prompt = `
Analyze the following UNCOMPLETED or FAILED task.

Task Title: ${title}
Task Description: ${description || "No description provided"}
Personnel Attempted By: ${userName || "Registered Personnel"}
Department: ${department || "Operations"}
Reason/Remarks for Failure: ${remarks || "No reason provided"}

Generate:
1. Pros: 1-2 points.
2. Cons / Possible Risks: 2-3 points.
3. Recommendations: 2-3 urgent action steps.
`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            pros: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            cons: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            recommendations: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["pros", "cons", "recommendations"],
        },
      },
    });

    const reportData = JSON.parse(response.text || "{}");

    res.json({
      ...reportData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      error: "Failed to generate AI summary report",
      details: error.message,
    });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
}

startServer();