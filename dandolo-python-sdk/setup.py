"""
Dandolo Python SDK Setup
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="dandolo-ai",
    version="1.0.0",
    author="Dandolo AI",
    author_email="developers@dandolo.ai",
    description="Python SDK for Dandolo decentralized AI network",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/dandolo-ai/python-sdk",
    project_urls={
        "Documentation": "https://docs.dandolo.ai",
        "API Reference": "https://api.dandolo.ai/docs",
        "Bug Tracker": "https://github.com/dandolo-ai/python-sdk/issues",
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    packages=find_packages(),
    python_requires=">=3.7",
    install_requires=[
        "requests>=2.25.0",
        "typing-extensions>=4.0.0; python_version<'3.8'",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov>=2.0",
            "black>=21.0",
            "flake8>=3.8",
            "mypy>=0.900",
        ],
        "async": [
            "aiohttp>=3.8.0",
        ],
    },
    keywords="ai, artificial intelligence, api, sdk, dandolo, decentralized, agent, llm",
    include_package_data=True,
    zip_safe=False,
)