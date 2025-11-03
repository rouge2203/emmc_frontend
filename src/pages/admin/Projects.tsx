const Projects = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Projects</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                View and manage active projects
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">GraphQL API</p>
                      <p className="text-sm text-gray-500">Backend API development</p>
                    </div>
                    <div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        In Progress
                      </span>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">iOS App</p>
                      <p className="text-sm text-gray-500">Mobile application for iOS</p>
                    </div>
                    <div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Planning
                      </span>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Android App</p>
                      <p className="text-sm text-gray-500">Mobile application for Android</p>
                    </div>
                    <div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Planning
                      </span>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">New Customer Portal</p>
                      <p className="text-sm text-gray-500">Customer self-service portal</p>
                    </div>
                    <div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        On Hold
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;

