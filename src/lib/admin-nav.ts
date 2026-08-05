import {
  Users,
  Mail,
  Inbox,
  CalendarPlus,
  Trophy,
  BarChart3,
  BookOpen,
  Megaphone,
  Lock,
  ScrollText,
  Stethoscope,
  Send,
  Globe,
} from "lucide-react";

export type SectionKey =
  | "members"
  | "mail"
  | "emaillog"
  | "domains"
  | "hackathons"
  | "results"
  | "insights"
  | "playbook"
  | "notices"
  | "inbox"
  | "access"
  | "audit"
  | "checks";

export const SECTION_KEYS: SectionKey[] = [
  "members",
  "mail",
  "emaillog",
  "domains",
  "inbox",
  "hackathons",
  "results",
  "insights",
  "playbook",
  "notices",
  "access",
  "audit",
  "checks",
];

export type SectionMeta = {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ownerOnly?: boolean;
};

export const ADMIN_NAV: { group: string; items: SectionMeta[] }[] = [
  {
    group: "People",
    items: [
      {
        key: "members",
        label: "Members",
        icon: Users,
        title: "Members",
        description: "Import students, review profiles, reset passwords and manage accounts.",
      },
      {
        key: "mail",
        label: "Mail",
        icon: Mail,
        title: "Mail",
        description: "Send individual or bulk email to club members.",
        ownerOnly: true,
      },
      {
        key: "emaillog",
        label: "Email log",
        icon: Send,
        title: "Email delivery log",
        description: "Every announcement and results email the app sent, with delivery status.",
        ownerOnly: true,
      },
      {
        key: "domains",
        label: "Sender domain",
        icon: Globe,
        title: "Sender domain",
        description: "Verify the club domain and choose the From address used for club email.",
        ownerOnly: true,
      },
      {
        key: "inbox",
        label: "Inbox",
        icon: Inbox,
        title: "Student inbox",
        description: "Answer doubts students send from the Ask admin page.",
        ownerOnly: true,
      },
    ],
  },
  {
    group: "Events",
    items: [
      {
        key: "hackathons",
        label: "Hackathons",
        icon: CalendarPlus,
        title: "Hackathons",
        description: "Create events, set team size and control registrations.",
      },
      {
        key: "results",
        label: "Results",
        icon: Trophy,
        title: "Results",
        description: "Mark attendance, award placements and points.",
      },
      {
        key: "insights",
        label: "Insights",
        icon: BarChart3,
        title: "Insights",
        description: "Club statistics, turnout and top performers.",
      },
    ],
  },
  {
    group: "Content",
    items: [
      {
        key: "playbook",
        label: "Playbook",
        icon: BookOpen,
        title: "Playbook",
        description: "Curate resources, templates and guides for members.",
      },
      {
        key: "notices",
        label: "Notices",
        icon: Megaphone,
        title: "Notice board",
        description: "Post announcements, outside hackathons, links and polls.",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "access",
        label: "Access",
        icon: Lock,
        title: "Access control",
        description: "Decide who is allowed to create a Yuga Spark account.",
        ownerOnly: true,
      },
      {
        key: "audit",
        label: "Audit log",
        icon: ScrollText,
        title: "Audit log",
        description:
          "Timestamped record of every student, hackathon, access and password change.",
        ownerOnly: true,
      },
      {
        key: "checks",
        label: "System checks",
        icon: Stethoscope,
        title: "System checks",
        description:
          "Run quick validations for login, access, hackathon CRUD and certificate downloads.",
      },
    ],
  },
];
