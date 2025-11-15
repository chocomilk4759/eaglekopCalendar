// {{PROJECT_NAME}}.Build.cs - Unreal Engine 5.0 Module Build Configuration

using UnrealBuildTool;

public class {{PROJECT_NAME}} : ModuleRules
{
    public {{PROJECT_NAME}}(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        
        // C++17 Standard (UE 5.0 default)
        CppStandard = CppStandardVersion.Cpp17;
        
        // Public dependencies (exposed to other modules)
        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore"  // Legacy Input System for UE 5.0
        });
        
        // Private dependencies (internal use only)
        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Slate",
            "SlateCore"
        });
        
        // Uncomment if using Online Features
        // PrivateDependencyModuleNames.Add("OnlineSubsystem");
        
        // Uncomment if using Enhanced Input (available but not mandatory in 5.0)
        // PrivateDependencyModuleNames.Add("EnhancedInput");
        
        // Public include paths
        PublicIncludePaths.AddRange(new string[]
        {
            // "{{PROJECT_NAME}}/Public"
        });
        
        // Private include paths
        PrivateIncludePaths.AddRange(new string[]
        {
            // "{{PROJECT_NAME}}/Private"
        });
        
        // Definitions
        PublicDefinitions.AddRange(new string[]
        {
            // "WITH_CUSTOM_FEATURE=1"
        });
    }
}
