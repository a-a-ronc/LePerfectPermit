import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            <span>PainlessPermit</span><sup className="text-gray-900">TM</sup>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Streamlined High-Piled Storage Permit Management
          </p>
          <p className="text-xs text-gray-500 mt-1">
            by Intralog
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to PainlessPermit<sup className="text-gray-900">TM</sup>
            </h2>
            <p className="text-gray-600 mb-4">
              Simplify your high-piled storage permit process with our comprehensive management solution.
            </p>
            <p className="text-gray-600 mb-4">
              Our permit specialists augmented by AI-powered workflows create a permit acquisition experience that is truly Painless.
            </p>
            <div className="mt-6">
              <Button className="w-full">
                Continue to Application
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
