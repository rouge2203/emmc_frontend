import { useParams } from "react-router-dom";

const ProjectDetail = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const decodedProjectName = projectName ? decodeURIComponent(projectName) : "Unknown Project";

  const getProjectStatus = (name: string) => {
    if (name === "GraphQL API") return { label: "In Progress", color: "green" };
    if (name === "iOS App" || name === "Android App") return { label: "Planning", color: "blue" };
    return { label: "On Hold", color: "yellow" };
  };

  const status = getProjectStatus(decodedProjectName);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-600">
              <h3 className="text-lg leading-6 font-medium text-white">
                {decodedProjectName}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-indigo-100">
                Project details and information
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Project Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {decodedProjectName}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        status.color === "green"
                          ? "bg-green-100 text-green-800"
                          : status.color === "blue"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {status.label}
                    </span>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Team</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    Engineering
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {decodedProjectName === "GraphQL API"
                      ? "Backend API development using GraphQL"
                      : decodedProjectName === "iOS App"
                      ? "Native iOS mobile application development"
                      : decodedProjectName === "Android App"
                      ? "Native Android mobile application development"
                      : "Customer self-service portal with advanced features"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;

