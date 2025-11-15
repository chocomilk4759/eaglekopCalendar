# {{PROJECT_NAME}} - Qt 6.8 CMake Configuration
cmake_minimum_required(VERSION 3.21)

project({{PROJECT_NAME}} 
    VERSION 1.0.0 
    DESCRIPTION "{{PROJECT_DESCRIPTION}}"
    LANGUAGES CXX
)

# C++20 requirement for Qt 6.8 features
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt 6.8 Find Package
find_package(Qt6 6.8 REQUIRED COMPONENTS
    Core
    Widgets
    Quick
    QuickWidgets
    Multimedia
    MultimediaWidgets
    Network
    Sql
    Test
)

# Qt 6.8 Standard Project Setup
qt_standard_project_setup()

# Enable Qt 6.8 enhanced features
set(QT_QML_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/qml)
set(QT_QUICK_COMPILER ON)

# Auto-generated MOC, RCC, UIC
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Source files
set(SOURCES
    src/main.cpp
    src/{{PROJECT_NAME_LOWER}}.cpp
    src/{{PROJECT_NAME_LOWER}}.h
    # Add more sources here
)

# Headers
set(HEADERS
    src/{{PROJECT_NAME_LOWER}}.h
    # Add more headers here
)

# Qt Resources
set(RESOURCES
    resources/{{PROJECT_NAME_LOWER}}.qrc
)

# Application target
qt_add_executable({{PROJECT_NAME}}
    ${SOURCES}
    ${HEADERS}
    ${RESOURCES}
)

# Qt 6.8: QML module (if using QML)
qt_add_qml_module({{PROJECT_NAME}}
    URI {{PROJECT_NAME}}
    VERSION 1.0
    QML_FILES
        qml/main.qml
        qml/components/MainWindow.qml
    RESOURCES
        resources/images/icon.png
)

# Link Qt 6.8 libraries
target_link_libraries({{PROJECT_NAME}} PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Quick
    Qt6::QuickWidgets
    Qt6::Multimedia
    Qt6::MultimediaWidgets
    Qt6::Network
    Qt6::Sql
)

# Qt 6.8 specific compile definitions
target_compile_definitions({{PROJECT_NAME}} PRIVATE
    QT_NO_DEBUG_OUTPUT
    QT_MESSAGELOGCONTEXT
    WITH_QT68_FEATURES=1
)

# Include directories
target_include_directories({{PROJECT_NAME}} PRIVATE
    src
    ${CMAKE_CURRENT_BINARY_DIR}
)

# Testing setup
if(BUILD_TESTING)
    enable_testing()
    
    qt_add_executable({{PROJECT_NAME}}Tests
        tests/main.cpp
        tests/{{PROJECT_NAME_LOWER}}_tests.cpp
        tests/{{PROJECT_NAME_LOWER}}_tests.h
        # Include source files for testing
        ${SOURCES}
    )
    
    target_link_libraries({{PROJECT_NAME}}Tests PRIVATE
        Qt6::Test
        Qt6::Core
        Qt6::Widgets
        Qt6::Quick
    )
    
    target_compile_definitions({{PROJECT_NAME}}Tests PRIVATE
        TESTING_ENABLED=1
    )
    
    add_test(NAME {{PROJECT_NAME}}Tests COMMAND {{PROJECT_NAME}}Tests)
endif()

# Qt 6.8: Deployment configuration
qt_generate_deploy_qml_app_script(
    TARGET {{PROJECT_NAME}}
    OUTPUT_SCRIPT deploy_script
    MACOS_BUNDLE_POST_BUILD
    NO_UNSUPPORTED_PLATFORM_ERROR
    DEPLOY_USER_QML_MODULES_ON_UNSUPPORTED_PLATFORM
)

install(SCRIPT ${deploy_script})

# Installation
install(TARGETS {{PROJECT_NAME}}
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)

# CPack configuration for packaging
set(CPACK_PACKAGE_NAME {{PROJECT_NAME}})
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "${PROJECT_DESCRIPTION}")
include(CPack)
