import { NextRequest, NextResponse } from "next/server";
import * as types from "../../../lib/types";
import { search } from "../../../lib/notion";

interface SearchParams {
  ancestorId: string;
  query: string;
  filters?: {
    isDeletedOnly?: boolean;
    excludeTemplates?: boolean;
    isNavigableOnly?: boolean;
    requireEditPermissions?: boolean;
    includePublicPagesWithoutExplicitAccess?: boolean;
  };
  limit?: number;
  searchSessionId?: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  const searchParams: SearchParams = await req.json();
  console.log("<<< lambda search-notion", searchParams);
  // as of 2024-11, notion search api payload must have includePublicPagesWithoutExplicitAccess
  // or no result will be returned.
  searchParams.filters = searchParams.filters || {};
  searchParams.filters.includePublicPagesWithoutExplicitAccess = true;
  const results = await search(searchParams as types.SearchParams);
  console.log(">>> lambda search-notion", results.results.length, results);
  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=60, max-age=60, stale-while-revalidate=60",
    },
  });
}
