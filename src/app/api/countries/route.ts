import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const response = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,cca2,flags,idd',
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Countries retrieved successfully",
      data: {
        data: response.data
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching countries:', message);
    
    const fallback = [
      {
        name: { common: "United Kingdom" },
        cca2: "GB",
        flags: { svg: "https://flagcdn.com/gb.svg" },
        idd: { root: "+4", suffixes: ["4"] }
      },
      {
        name: { common: "United States" },
        cca2: "US",
        flags: { svg: "https://flagcdn.com/us.svg" },
        idd: { root: "+1", suffixes: [""] }
      },
      {
        name: { common: "United Arab Emirates" },
        cca2: "AE",
        flags: { svg: "https://flagcdn.com/ae.svg" },
        idd: { root: "+9", suffixes: ["71"] }
      }
    ];

    return NextResponse.json({
      success: true,
      message: "Fallback countries retrieved",
      data: {
        data: fallback
      }
    }, { status: 200 }); 
  }
}
