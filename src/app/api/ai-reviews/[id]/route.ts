import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assessmentId } = await params;

  return NextResponse.json({
    success: true,
    message: "AI review retrieved successfully",
    data: {
      id: "550e8400-e29b-41d4-a716-446655440001",
      certificate_assessment_id: assessmentId,
      review_description: "45 of 50 responses passed (90%). 5 response(s) flagged for review.",
      review_status: "completed",
      total_flags: 5,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responses: [
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          assessment_query_id: "550e8400-e29b-41d4-a716-446655440020",
          ai_review_id: "550e8400-e29b-41d4-a716-446655440001",
          response: "Our discrimination policy covers all aspects of workforce diversity and inclusion.",
          is_flagged: false,
          flag_reason: null,
          confidence_score: 98,
          created_at: new Date().toISOString(),
          question_text: "Discrimination policy", 
          question_type: "text",
          response_type: "text",
          response_value: "No discrimination"
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440011",
          assessment_query_id: "550e8400-e29b-41d4-a716-446655440021",
          ai_review_id: "550e8400-e29b-41d4-a716-446655440001",
          response: "We have updated fire safety protocols which are reviewed annually.",
          is_flagged: false,
          flag_reason: null,
          confidence_score: 95,
          created_at: new Date().toISOString(),
          question_text: "Do you have fire safety procedures in place?",
          question_type: "boolean",
          response_type: "boolean",
          response_value: "yes"
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440012",
          assessment_query_id: "550e8400-e29b-41d4-a716-446655440022",
          ai_review_id: "550e8400-e29b-41d4-a716-446655440001",
          response: "The operational structure includes the Board of Directors, CEO, and clear departmental hierarchies.",
          is_flagged: false,
          flag_reason: null,
          confidence_score: 97,
          created_at: new Date().toISOString(),
          question_text: "Upload operational structure documents",
          question_type: "file",
          response_type: "file",
          response_value: "yes"
        }
      ]
    },
    statusCode: 200,
    timestamp: new Date().toISOString()
  });
}
