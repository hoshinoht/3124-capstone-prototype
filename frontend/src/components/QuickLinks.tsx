import { useState, useEffect } from "react";
import { Video, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { quickLinksApi } from "../services/api";

interface MeetingLink {
  id: number;
  title: string;
  datetime: string;
  attendees: string;
  url?: string;
}

const defaultMeetings: MeetingLink[] = [
  {
    id: 1,
    title: "NUHS Weekly Meeting",
    datetime: "May 10, 10:00 - 11:00 AM",
    attendees: "Gloria, Ian Yi, June"
  },
  {
    id: 2,
    title: "AMK Hub Project Sync",
    datetime: "May 16, 09:30 - 10:16 AM",
    attendees: "Wang Yue, Helen"
  },
  {
    id: 3,
    title: "Sports Hub Coordination",
    datetime: "May 15, 11:30 AM - 12:30 PM",
    attendees: "Jasper, Marcus, Ethel"
  },
  {
    id: 4,
    title: "VivoCity Client Review",
    datetime: "May 15, 1:15 - 2:15 PM",
    attendees: "Kendrick, Jie Yi, Wong"
  },
];

export function QuickLinks() {
  const [meetings, setMeetings] = useState<MeetingLink[]>(defaultMeetings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickLinks = async () => {
      try {
        setLoading(true);
        const data = await quickLinksApi.getQuickLinks();
        if (data && data.length > 0) {
          setMeetings(data.map((link: any) => ({
            id: link.id,
            title: link.title,
            datetime: link.datetime || link.description || "",
            attendees: link.attendees || "",
            url: link.url,
          })));
        }
      } catch (err) {
        console.error("Failed to fetch quick links:", err);
        // Keep default mock data
      } finally {
        setLoading(false);
      }
    };

    fetchQuickLinks();
  }, []);

  const handleOpenLink = (meeting: MeetingLink) => {
    if (meeting.url) {
      window.open(meeting.url, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription className="text-gray-400">
            One-click access to recurring meeting links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardHeader>
        <CardTitle>Quick Links</CardTitle>
        <CardDescription className="text-gray-400">
          One-click access to recurring meeting links
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => handleOpenLink(meeting)}
              className="text-left p-4 hover:bg-gray-800 rounded-lg transition-colors flex items-start gap-3 border border-gray-700 hover:border-gray-600"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-400 mb-1">{meeting.title}</p>
                <p className="text-xs text-gray-400 mb-0.5">{meeting.datetime}</p>
                <p className="text-xs text-gray-500">{meeting.attendees}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
