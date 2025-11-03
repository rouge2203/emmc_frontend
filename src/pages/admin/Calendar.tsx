const Calendar = () => {
  const upcomingEvents = [
    { title: "Team Standup", date: "2024-01-15", time: "9:00 AM" },
    { title: "Sprint Planning", date: "2024-01-16", time: "2:00 PM" },
    { title: "Client Meeting", date: "2024-01-17", time: "10:00 AM" },
    { title: "Code Review", date: "2024-01-18", time: "3:00 PM" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Calendar</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                View and manage your schedule
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Upcoming Events</h4>
                <ul className="divide-y divide-gray-200">
                  {upcomingEvents.map((event, index) => (
                    <li key={index} className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {event.date} at {event.time}
                          </p>
                        </div>
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

