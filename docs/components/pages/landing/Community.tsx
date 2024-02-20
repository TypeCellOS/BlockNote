import Image from "next/image";
import { Link } from "nextra-theme-docs";
import { DiscordIcon } from "nextra/icons";
import { FC } from "react";
import { SectionHeader, SectionSubtext } from "../home-shared/Headings";

interface Contributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

const safeResJson = (res: Response) => {
  if (res.ok) {
    return res.json();
  }
  throw new Error("Internal server error!");
};

function fetchContributors() {
  // try {
  //   const result = await fetch(
  //     "https://api.github.com/repos/themesberg/flowbite-react/contributors?per_page=21",
  //   );

  //   return safeResJson(result);
  // } catch (error) {
  //   return [];
  // }
  return [
    {
      login: "YousefED",
      id: 368857,
      node_id: "MDQ6VXNlcjM2ODg1Nw==",
      avatar_url: "https://avatars.githubusercontent.com/u/368857?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/YousefED",
      html_url: "https://github.com/YousefED",
      followers_url: "https://api.github.com/users/YousefED/followers",
      following_url:
        "https://api.github.com/users/YousefED/following{/other_user}",
      gists_url: "https://api.github.com/users/YousefED/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/YousefED/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/YousefED/subscriptions",
      organizations_url: "https://api.github.com/users/YousefED/orgs",
      repos_url: "https://api.github.com/users/YousefED/repos",
      events_url: "https://api.github.com/users/YousefED/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/YousefED/received_events",
      type: "User",
      site_admin: false,
      contributions: 148,
    },
    {
      login: "17Amir17",
      id: 36531255,
      node_id: "MDQ6VXNlcjM2NTMxMjU1",
      avatar_url: "https://avatars.githubusercontent.com/u/36531255?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/17Amir17",
      html_url: "https://github.com/17Amir17",
      followers_url: "https://api.github.com/users/17Amir17/followers",
      following_url:
        "https://api.github.com/users/17Amir17/following{/other_user}",
      gists_url: "https://api.github.com/users/17Amir17/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/17Amir17/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/17Amir17/subscriptions",
      organizations_url: "https://api.github.com/users/17Amir17/orgs",
      repos_url: "https://api.github.com/users/17Amir17/repos",
      events_url: "https://api.github.com/users/17Amir17/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/17Amir17/received_events",
      type: "User",
      site_admin: false,
      contributions: 123,
    },
    {
      login: "matthewlipski",
      id: 50169049,
      node_id: "MDQ6VXNlcjUwMTY5MDQ5",
      avatar_url: "https://avatars.githubusercontent.com/u/50169049?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/matthewlipski",
      html_url: "https://github.com/matthewlipski",
      followers_url: "https://api.github.com/users/matthewlipski/followers",
      following_url:
        "https://api.github.com/users/matthewlipski/following{/other_user}",
      gists_url: "https://api.github.com/users/matthewlipski/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/matthewlipski/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/matthewlipski/subscriptions",
      organizations_url: "https://api.github.com/users/matthewlipski/orgs",
      repos_url: "https://api.github.com/users/matthewlipski/repos",
      events_url: "https://api.github.com/users/matthewlipski/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/matthewlipski/received_events",
      type: "User",
      site_admin: false,
      contributions: 114,
    },
    {
      login: "GuySerfaty",
      id: 17720782,
      node_id: "MDQ6VXNlcjE3NzIwNzgy",
      avatar_url: "https://avatars.githubusercontent.com/u/17720782?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/GuySerfaty",
      html_url: "https://github.com/GuySerfaty",
      followers_url: "https://api.github.com/users/GuySerfaty/followers",
      following_url:
        "https://api.github.com/users/GuySerfaty/following{/other_user}",
      gists_url: "https://api.github.com/users/GuySerfaty/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/GuySerfaty/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/GuySerfaty/subscriptions",
      organizations_url: "https://api.github.com/users/GuySerfaty/orgs",
      repos_url: "https://api.github.com/users/GuySerfaty/repos",
      events_url: "https://api.github.com/users/GuySerfaty/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/GuySerfaty/received_events",
      type: "User",
      site_admin: false,
      contributions: 9,
    },
    {
      login: "tomeryp",
      id: 4117403,
      node_id: "MDQ6VXNlcjQxMTc0MDM=",
      avatar_url: "https://avatars.githubusercontent.com/u/4117403?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/tomeryp",
      html_url: "https://github.com/tomeryp",
      followers_url: "https://api.github.com/users/tomeryp/followers",
      following_url:
        "https://api.github.com/users/tomeryp/following{/other_user}",
      gists_url: "https://api.github.com/users/tomeryp/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/tomeryp/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/tomeryp/subscriptions",
      organizations_url: "https://api.github.com/users/tomeryp/orgs",
      repos_url: "https://api.github.com/users/tomeryp/repos",
      events_url: "https://api.github.com/users/tomeryp/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/tomeryp/received_events",
      type: "User",
      site_admin: false,
      contributions: 4,
    },
    {
      login: "horacioh",
      id: 725120,
      node_id: "MDQ6VXNlcjcyNTEyMA==",
      avatar_url: "https://avatars.githubusercontent.com/u/725120?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/horacioh",
      html_url: "https://github.com/horacioh",
      followers_url: "https://api.github.com/users/horacioh/followers",
      following_url:
        "https://api.github.com/users/horacioh/following{/other_user}",
      gists_url: "https://api.github.com/users/horacioh/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/horacioh/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/horacioh/subscriptions",
      organizations_url: "https://api.github.com/users/horacioh/orgs",
      repos_url: "https://api.github.com/users/horacioh/repos",
      events_url: "https://api.github.com/users/horacioh/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/horacioh/received_events",
      type: "User",
      site_admin: false,
      contributions: 3,
    },
    {
      login: "i-am-chitti",
      id: 60139930,
      node_id: "MDQ6VXNlcjYwMTM5OTMw",
      avatar_url: "https://avatars.githubusercontent.com/u/60139930?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/i-am-chitti",
      html_url: "https://github.com/i-am-chitti",
      followers_url: "https://api.github.com/users/i-am-chitti/followers",
      following_url:
        "https://api.github.com/users/i-am-chitti/following{/other_user}",
      gists_url: "https://api.github.com/users/i-am-chitti/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/i-am-chitti/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/i-am-chitti/subscriptions",
      organizations_url: "https://api.github.com/users/i-am-chitti/orgs",
      repos_url: "https://api.github.com/users/i-am-chitti/repos",
      events_url: "https://api.github.com/users/i-am-chitti/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/i-am-chitti/received_events",
      type: "User",
      site_admin: false,
      contributions: 2,
    },
    {
      login: "DAlperin",
      id: 16063713,
      node_id: "MDQ6VXNlcjE2MDYzNzEz",
      avatar_url: "https://avatars.githubusercontent.com/u/16063713?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/DAlperin",
      html_url: "https://github.com/DAlperin",
      followers_url: "https://api.github.com/users/DAlperin/followers",
      following_url:
        "https://api.github.com/users/DAlperin/following{/other_user}",
      gists_url: "https://api.github.com/users/DAlperin/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/DAlperin/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/DAlperin/subscriptions",
      organizations_url: "https://api.github.com/users/DAlperin/orgs",
      repos_url: "https://api.github.com/users/DAlperin/repos",
      events_url: "https://api.github.com/users/DAlperin/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/DAlperin/received_events",
      type: "User",
      site_admin: false,
      contributions: 2,
    },
    {
      login: "tensor-tian",
      id: 101185214,
      node_id: "U_kgDOBgf2vg",
      avatar_url: "https://avatars.githubusercontent.com/u/101185214?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/tensor-tian",
      html_url: "https://github.com/tensor-tian",
      followers_url: "https://api.github.com/users/tensor-tian/followers",
      following_url:
        "https://api.github.com/users/tensor-tian/following{/other_user}",
      gists_url: "https://api.github.com/users/tensor-tian/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/tensor-tian/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/tensor-tian/subscriptions",
      organizations_url: "https://api.github.com/users/tensor-tian/orgs",
      repos_url: "https://api.github.com/users/tensor-tian/repos",
      events_url: "https://api.github.com/users/tensor-tian/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/tensor-tian/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "sudarshanshenoy",
      id: 13462896,
      node_id: "MDQ6VXNlcjEzNDYyODk2",
      avatar_url: "https://avatars.githubusercontent.com/u/13462896?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/sudarshanshenoy",
      html_url: "https://github.com/sudarshanshenoy",
      followers_url: "https://api.github.com/users/sudarshanshenoy/followers",
      following_url:
        "https://api.github.com/users/sudarshanshenoy/following{/other_user}",
      gists_url: "https://api.github.com/users/sudarshanshenoy/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/sudarshanshenoy/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/sudarshanshenoy/subscriptions",
      organizations_url: "https://api.github.com/users/sudarshanshenoy/orgs",
      repos_url: "https://api.github.com/users/sudarshanshenoy/repos",
      events_url:
        "https://api.github.com/users/sudarshanshenoy/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/sudarshanshenoy/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "cuire",
      id: 81014305,
      node_id: "MDQ6VXNlcjgxMDE0MzA1",
      avatar_url: "https://avatars.githubusercontent.com/u/81014305?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/cuire",
      html_url: "https://github.com/cuire",
      followers_url: "https://api.github.com/users/cuire/followers",
      following_url:
        "https://api.github.com/users/cuire/following{/other_user}",
      gists_url: "https://api.github.com/users/cuire/gists{/gist_id}",
      starred_url: "https://api.github.com/users/cuire/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/cuire/subscriptions",
      organizations_url: "https://api.github.com/users/cuire/orgs",
      repos_url: "https://api.github.com/users/cuire/repos",
      events_url: "https://api.github.com/users/cuire/events{/privacy}",
      received_events_url: "https://api.github.com/users/cuire/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "fogle",
      id: 39360,
      node_id: "MDQ6VXNlcjM5MzYw",
      avatar_url: "https://avatars.githubusercontent.com/u/39360?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/fogle",
      html_url: "https://github.com/fogle",
      followers_url: "https://api.github.com/users/fogle/followers",
      following_url:
        "https://api.github.com/users/fogle/following{/other_user}",
      gists_url: "https://api.github.com/users/fogle/gists{/gist_id}",
      starred_url: "https://api.github.com/users/fogle/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/fogle/subscriptions",
      organizations_url: "https://api.github.com/users/fogle/orgs",
      repos_url: "https://api.github.com/users/fogle/repos",
      events_url: "https://api.github.com/users/fogle/events{/privacy}",
      received_events_url: "https://api.github.com/users/fogle/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "richmengsix",
      id: 2321921,
      node_id: "MDQ6VXNlcjIzMjE5MjE=",
      avatar_url: "https://avatars.githubusercontent.com/u/2321921?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/richmengsix",
      html_url: "https://github.com/richmengsix",
      followers_url: "https://api.github.com/users/richmengsix/followers",
      following_url:
        "https://api.github.com/users/richmengsix/following{/other_user}",
      gists_url: "https://api.github.com/users/richmengsix/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/richmengsix/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/richmengsix/subscriptions",
      organizations_url: "https://api.github.com/users/richmengsix/orgs",
      repos_url: "https://api.github.com/users/richmengsix/repos",
      events_url: "https://api.github.com/users/richmengsix/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/richmengsix/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "PhilipWillms",
      id: 44462043,
      node_id: "MDQ6VXNlcjQ0NDYyMDQz",
      avatar_url: "https://avatars.githubusercontent.com/u/44462043?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/PhilipWillms",
      html_url: "https://github.com/PhilipWillms",
      followers_url: "https://api.github.com/users/PhilipWillms/followers",
      following_url:
        "https://api.github.com/users/PhilipWillms/following{/other_user}",
      gists_url: "https://api.github.com/users/PhilipWillms/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/PhilipWillms/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/PhilipWillms/subscriptions",
      organizations_url: "https://api.github.com/users/PhilipWillms/orgs",
      repos_url: "https://api.github.com/users/PhilipWillms/repos",
      events_url: "https://api.github.com/users/PhilipWillms/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/PhilipWillms/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "niclas-j",
      id: 35239311,
      node_id: "MDQ6VXNlcjM1MjM5MzEx",
      avatar_url: "https://avatars.githubusercontent.com/u/35239311?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/niclas-j",
      html_url: "https://github.com/niclas-j",
      followers_url: "https://api.github.com/users/niclas-j/followers",
      following_url:
        "https://api.github.com/users/niclas-j/following{/other_user}",
      gists_url: "https://api.github.com/users/niclas-j/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/niclas-j/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/niclas-j/subscriptions",
      organizations_url: "https://api.github.com/users/niclas-j/orgs",
      repos_url: "https://api.github.com/users/niclas-j/repos",
      events_url: "https://api.github.com/users/niclas-j/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/niclas-j/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "danlgz",
      id: 26347085,
      node_id: "MDQ6VXNlcjI2MzQ3MDg1",
      avatar_url: "https://avatars.githubusercontent.com/u/26347085?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/danlgz",
      html_url: "https://github.com/danlgz",
      followers_url: "https://api.github.com/users/danlgz/followers",
      following_url:
        "https://api.github.com/users/danlgz/following{/other_user}",
      gists_url: "https://api.github.com/users/danlgz/gists{/gist_id}",
      starred_url: "https://api.github.com/users/danlgz/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/danlgz/subscriptions",
      organizations_url: "https://api.github.com/users/danlgz/orgs",
      repos_url: "https://api.github.com/users/danlgz/repos",
      events_url: "https://api.github.com/users/danlgz/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/danlgz/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "CTNicholas",
      id: 33033422,
      node_id: "MDQ6VXNlcjMzMDMzNDIy",
      avatar_url: "https://avatars.githubusercontent.com/u/33033422?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/CTNicholas",
      html_url: "https://github.com/CTNicholas",
      followers_url: "https://api.github.com/users/CTNicholas/followers",
      following_url:
        "https://api.github.com/users/CTNicholas/following{/other_user}",
      gists_url: "https://api.github.com/users/CTNicholas/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/CTNicholas/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/CTNicholas/subscriptions",
      organizations_url: "https://api.github.com/users/CTNicholas/orgs",
      repos_url: "https://api.github.com/users/CTNicholas/repos",
      events_url: "https://api.github.com/users/CTNicholas/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/CTNicholas/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
    {
      login: "charlesfrisbee",
      id: 32081962,
      node_id: "MDQ6VXNlcjMyMDgxOTYy",
      avatar_url: "https://avatars.githubusercontent.com/u/32081962?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/charlesfrisbee",
      html_url: "https://github.com/charlesfrisbee",
      followers_url: "https://api.github.com/users/charlesfrisbee/followers",
      following_url:
        "https://api.github.com/users/charlesfrisbee/following{/other_user}",
      gists_url: "https://api.github.com/users/charlesfrisbee/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/charlesfrisbee/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/charlesfrisbee/subscriptions",
      organizations_url: "https://api.github.com/users/charlesfrisbee/orgs",
      repos_url: "https://api.github.com/users/charlesfrisbee/repos",
      events_url:
        "https://api.github.com/users/charlesfrisbee/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/charlesfrisbee/received_events",
      type: "User",
      site_admin: false,
      contributions: 1,
    },
  ];
}

export const ContributorsSection: FC = () => {
  const contributors = fetchContributors();

  return (
    <section>
      {/* TODO: clean html? */}
      <div className="max-w-8xl mx-auto px-4 py-8 lg:px-20 lg:py-24">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12">
          <div className="flex max-w-2xl flex-col items-center justify-center gap-4 text-center">
            <SectionHeader>Community contributors</SectionHeader>
            <SectionSubtext>
              Join a community of open-source contributors by tuning in with the
              BlockNote community and contribute to the project.
            </SectionSubtext>
          </div>
          <div className="flex max-w-5xl flex-col gap-3 px-4 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {contributors.map((contributor) => (
                // <Tooltip key={contributor.id} content={contributor.login}>
                <Link
                  key={contributor.id}
                  href={contributor.html_url}
                  rel="nofollow noreferrer noopener"
                  target="_blank">
                  <Image
                    src={contributor.avatar_url}
                    alt={`${contributor.login} avatar`}
                    className="h-10 w-10 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 sm:h-12 sm:w-12 lg:h-16 lg:w-16"
                    width={64}
                    height={64}
                  />
                </Link>
                // </Tooltip>
              ))}
            </div>
          </div>
          <div className="flex w-full max-w-5xl flex-row items-center justify-between lg:px-4">
            <div className="flex w-full flex-col items-start justify-between gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 sm:flex-row sm:items-center sm:gap-8">
              <div className="hidden lg:block lg:w-fit">
                <DiscordIcon width={30} />
              </div>
              <div className="flex w-full flex-col">
                <h2 className="text-left text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Join the community
                </h2>
                <p>
                  Become a member of a community of developers by collaborating
                  on Discord
                </p>
              </div>
              <Link
                href="https://github.com/TypeCellOS/BlockNote"
                className="flex items-center gap-2 whitespace-nowrap text-base font-medium text-cyan-700 hover:underline">
                See our repository{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  aria-label="chevron right"
                  fill="none"
                  viewBox="0 0 20 20"
                  strokeWidth="2">
                  <path
                    clipRule="evenodd"
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
          </div>
          {/* TODO: make this two blocks, one for github, one for discord */}
        </div>
      </div>
    </section>
  );
};
