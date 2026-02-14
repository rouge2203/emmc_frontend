import { useParams } from "react-router-dom";

const TeamDetail = () => {
  const { teamName } = useParams<{ teamName: string }>();
  const decodedTeamName = teamName
    ? decodeURIComponent(teamName)
    : "Unknown Team";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-primary">
              <h3 className="text-lg leading-6 font-medium text-white">
                {decodedTeamName} Team
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-primary">
                Team details and member information
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Team Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {decodedTeamName}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Department
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {decodedTeamName}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Members</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {decodedTeamName === "Engineering"
                      ? "12"
                      : decodedTeamName === "Human Resources"
                        ? "8"
                        : "15"}{" "}
                    active members
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
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

export default TeamDetail;
