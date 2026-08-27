"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ArticleCardProps {
  headline: string;
  excerpt: string;
  cover?: string;
  tag?: string;
  readingTime?: number; // in seconds
  writer?: string;
  publishedAt?: Date;
  clampLines?: number;
  onClick?: () => void;
}

// Human-friendly read time: seconds -> "X min read"
export function formatReadTime(seconds: number): string {
  if (!seconds || seconds < 60) return "Less than 1 min read";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min read`;
}

// Date -> "Aug 15, 2025" (localized but concise)
export function formatPostDate(date: Date): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  cover,
  tag,
  readingTime,
  headline,
  excerpt,
  writer,
  publishedAt,
  clampLines = 3,
  onClick,
}) => {
  const hasMeta = tag || readingTime;
  const hasFooter = writer || publishedAt;

  return (
    <Card
      onClick={onClick}
      className="flex w-full flex-col gap-3 overflow-hidden rounded-3xl border border-[#1F293D] bg-[#131926]/90 p-4 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-theme-primary/50 hover:shadow-theme-glow cursor-pointer group"
    >
      {cover && (
        <CardHeader className="p-0">
          <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-slate-950">
            <img
              src={cover}
              alt={headline}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131926] via-transparent to-transparent" />
          </div>
        </CardHeader>
      )}

      <CardContent className="flex-grow p-3 space-y-2">
        {hasMeta && (
          <div className="flex items-center text-xs text-slate-400 gap-2">
            {tag && (
              <Badge variant="default" className="rounded-full px-3 py-1 text-xs">
                {tag}
              </Badge>
            )}
            {tag && readingTime && <span>•</span>}
            {readingTime && <span className="text-slate-400">{formatReadTime(readingTime)}</span>}
          </div>
        )}

        <h2 className="text-lg font-bold leading-tight text-slate-100 group-hover:text-theme-primary transition-colors">
          {headline}
        </h2>

        <p
          className={cn("text-xs text-slate-400 leading-relaxed", {
            "overflow-hidden text-ellipsis [-webkit-box-orient:vertical] [display:-webkit-box]":
              clampLines && clampLines > 0,
          })}
          style={{
            WebkitLineClamp: clampLines,
          }}
        >
          {excerpt}
        </p>
      </CardContent>

      {hasFooter && (
        <CardFooter className="flex items-center justify-between p-3 border-t border-[#1F293D]/60 text-xs">
          {writer && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Por</p>
              <p className="font-bold text-slate-300">{writer}</p>
            </div>
          )}
          {publishedAt && (
            <div className={writer ? "text-right" : ""}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Publicado em</p>
              <p className="font-semibold text-slate-300">
                {formatPostDate(publishedAt)}
              </p>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
