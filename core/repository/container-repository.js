var AbstractRepository = require("core/repository/abstract-repository").AbstractRepository,
    DockerContainerSectionDao = require("core/dao/docker-container-section-dao").DockerContainerSectionDao,
    DockerImageDao = require("core/dao/docker-image-dao").DockerImageDao,
    DockerHostDao = require("core/dao/docker-host-dao").DockerHostDao,
    DockerContainerDao = require("core/dao/docker-container-dao").DockerContainerDao;

exports.ContainerRepository = AbstractRepository.specialize({

    init: {
        value: function (dockerContainerSectionDao, dockerContainerDao, dockerImageDao, dockerHostDao) {
            this._dockerContainerSectionDao = dockerContainerSectionDao || DockerContainerSectionDao.instance;
            this._dockerContainerDao = dockerContainerDao || DockerContainerDao.instance;
            this._dockerImageDao = dockerImageDao || DockerImageDao.instance;
            this._dockerHostDao = dockerHostDao || DockerHostDao.instance;
        }
    },

    getNewDockerImage: {
        value: function () {
            return this._dockerImageDao.getNewInstance();
        }
    },

    getNewDockerContainer: {
        value: function () {
            return this._dockerImageDao.getNewInstance();
        }
    },

    getNewEmptyDockerContainerSectionList: {
        value: function() {
            return this._dockerContainerSectionDao.getEmptyList();
        }
    },

    getNewEmptyDockerContainerList: {
        value: function() {
            return this._dockerContainerDao.getEmptyList();
        }
    },

    getNewEmptyDockerImageList: {
        value: function() {
            return this._dockerImageDao.getEmptyList();
        }
    },

    getNewEmptyDockerHostList: {
        value: function() {
            return this._dockerHostDao.getEmptyList();
        }
    },

    listDockerContainers: {
        value: function () {
            return this._dockerContainerDao.list();
        }
    },
    
    listContainerSections: {
        value: function () {
            var self = this;

            return Promise.all([
                self.getNewEmptyDockerContainerSectionList(),
                //Add sub container sections here
                
                self.getNewEmptyDockerContainerList(),
                self.getNewEmptyDockerHostList(),
                self.getNewEmptyDockerImageList()
            ]).then(function (data) {
                var containerSections = data[0];

                for (var i = 1, length = data.length; i < length; i++) {
                    containerSections.push(data[i]);
                }

                return containerSections;
            });
        }
    },

    listDockerImages: {
        value: function () {
            return this._dockerImageDao.list();
        }
    }

});
