const Reports = () => {
  const reports = [
    { title: "Monthly Sales Report", category: "Sales", date: "2024-01-01", status: "Published" },
    { title: "Q4 Financial Summary", category: "Finance", date: "2024-01-05", status: "Draft" },
    { title: "User Engagement Metrics", category: "Analytics", date: "2024-01-08", status: "Published" },
    { title: "Team Performance Review", category: "HR", date: "2024-01-10", status: "Review" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Reports</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                View and manage analytics reports
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-indigo-600">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-900">24</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Published</p>
                    <p className="text-2xl font-bold text-gray-900">18</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-600">In Draft</p>
                    <p className="text-2xl font-bold text-gray-900">6</p>
                  </div>
                </div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Recent Reports</h4>
                <ul className="divide-y divide-gray-200">
                  {reports.map((report, index) => (
                    <li key={index} className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{report.title}</p>
                          <p className="text-sm text-gray-500">
                            {report.category} • {report.date}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              report.status
                            )}`}
                          >
                            {report.status}
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

export default Reports;

