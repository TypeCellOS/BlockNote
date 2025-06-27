import Link from "next/link";
import { ReactNode } from "react";

export const JoinButton = (props: {
  text: string;
  subtext: string;
  icon: ReactNode;
  linkTitle: string;
  linkUrl: string;
}) => {
  return (
    <div
      className={
        "border-fd-border flex w-full flex-col items-start justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-8 md:max-w-screen-md"
      }
    >
      <div className={"hidden md:block md:w-fit"}>{props.icon}</div>
      <div className={"flex w-full flex-col items-start justify-start"}>
        <h2
          className={
            "text-left text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          }
        >
          {props.text}
        </h2>
        <p className={"text-left"}>{props.subtext}</p>
      </div>
      <Link
        href={props.linkUrl}
        className={
          "flex items-center gap-2 whitespace-nowrap text-base font-medium text-cyan-700 hover:underline"
        }
      >
        {props.linkTitle + " "}
        <svg
          xmlns={"http://www.w3.org/2000/svg"}
          width={"20"}
          height={"20"}
          aria-label={"chevron right"}
          fill={"none"}
          viewBox={"0 0 20 20"}
          strokeWidth={"2"}
        >
          <path
            clipRule={"evenodd"}
            fillRule={"evenodd"}
            d={
              "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            }
            fill={"currentColor"}
          />
        </svg>
      </Link>
    </div>
  );
};
