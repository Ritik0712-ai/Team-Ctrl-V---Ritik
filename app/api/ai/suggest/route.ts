import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServerClient } from "@/lib/db";

// Fallback to empty string if no API key is provided yet, to prevent app crash on load
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "missing_key" });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    if (process.env.GROQ_API_KEY === undefined || process.env.GROQ_API_KEY === "") {
       return NextResponse.json({ success: false, error: "GROQ_API_KEY is not configured in .env.local" }, { status: 500 });
    }

    const systemPrompt = `You are an AI venue booking assistant. Parse the user's natural language request to book an event and return structured data. 

You must return ONLY a JSON object that perfectly matches this schema:
{
  "date": "The requested date in YYYY-MM-DD format. E.g., 5th august -> 2026-08-05. Assume current year is 2026.",
  "attendees": <integer number of expected attendees. E.g. 60>,
  "equipment": ["<A list of requested equipment EXACTLY matching these exact string values: LAPTOP, PROJECTOR, MICROPHONE, SPEAKER, STANDING_BOARD, WHITEBOARD, EXTENSION_CORD. Do not use lowercase or spaces.>"]
}

Make sure to ONLY return valid JSON. Do not return markdown blocks like \`\`\`json.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Failed to generate AI response");
    }

    const parsedData = JSON.parse(responseContent);

    // Now query the DB locally to avoid Groq Token Limits
    const supabase = createServerClient();
    
    // Fetch venues that fit capacity, ordered by smallest that fits first
    const { data: venues, error: venueError } = await supabase
      .from("venues")
      .select("id, name, capacity, venue_type")
      .gte("capacity", parsedData.attendees || 1)
      .order("capacity", { ascending: true })
      .limit(3);

    if (venueError) {
      throw new Error("Database error while fetching venues");
    }

    // Format suggestions
    const suggestions = venues?.map(v => ({
      venue_id: v.id,
      reason: `The ${v.venue_type.toLowerCase().replace('_', ' ')} "${v.name}" is a great fit, holding up to ${v.capacity} attendees.`
    })) || [];

    parsedData.suggestions = suggestions;

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process AI request" }, { status: 500 });
  }
}
