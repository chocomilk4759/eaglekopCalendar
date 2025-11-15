// {{PROJECT_NAME}} Build Configuration for UE 5.3
using UnrealBuildTool;

public class {{PROJECT_NAME}} : ModuleRules
{
    public {{PROJECT_NAME}}(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        // UE 5.3 Core Dependencies
        PublicDependencyModuleNames.AddRange(new string[] 
        { 
            "Core", 
            "CoreUObject", 
            "Engine", 
            "InputCore",
            "EnhancedInput",      // UE 5.3 Enhanced Input (Required)
            "PCG",                // UE 5.3 Procedural Content Generation
            "RenderCore",         // For Nanite/Lumen integration
            "RHI"
        });

        PrivateDependencyModuleNames.AddRange(new string[] 
        { 
            "Slate", 
            "SlateCore",
            "UnrealEd",
            "ToolMenus",
            "EditorWidgets"
        });

        // UE 5.3 Development Features
        if (Target.Configuration != UnrealTargetConfiguration.Shipping)
        {
            PublicDefinitions.Add("UE53_DEVELOPMENT=1");
            PrivateDependencyModuleNames.Add("AutomationTest");
        }

        // UE 5.3 Enhanced Features
        PublicDefinitions.AddRange(new string[]
        {
            "WITH_ENHANCED_INPUT=1",
            "WITH_PCG_FRAMEWORK=1",
            "WITH_NANITE_SUPPORT=1",
            "WITH_LUMEN_SUPPORT=1"
        });

        // Platform-specific optimizations
        if (Target.Platform == UnrealTargetPlatform.Windows)
        {
            PublicDefinitions.Add("PLATFORM_SUPPORTS_HARDWARE_RT=1");
        }

        // UE 5.3 C++17 Standard
        CppStandard = CppStandardVersion.Cpp17;
        
        // Memory optimization for large projects
        bEnableExceptions = false;
        bUseRTTI = false;
    }
}
