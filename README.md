# 基于Docker的 DevOps CI/CD实践

> 本文默认已经安装好了Rancher，如果没有安装：
> ```bash
> sudo docker run -d --restart=unless-stopped -p 8080:8080 rancher/server
> ```
> 真正的天才，必须能够让事情变得简单。

## 零、前言

相信我，一切事情的发生都是赶鸭子上架，没有例外。人类所有伟大的变革都是迫不得已，可又是那么顺其自然。比如容器（docker）技术的诞生，比如箭在弦上的创业，比如野心勃勃的kubernetes，比如如今已作为我们左膀右臂的rancher，比如这篇文章。

不同于郑兄的CI/CD实践（[如何利用Docker构建基于DevOps的全自动CI][Zheng]），我们结合自身状况，构建了一套我们自己的DevOps CI/CD流程，更轻更小，更适合Startup。


## 一、Node.js适合我们，Docker适合我们

如果世界只有FLAG、BAT，那就太无趣了。iHealth是一家初创型公司，我所在的部门有大概10名研发人员，在担负着三端研发工作的同时，所有围绕我们服务的交付和运维工作也都是我们来做。

技术的选型上，服务端、Web端和移动端（Android、iOS）都要上，但人少。所以招人的时候我们没有以貌取人的资格，部门对外的Title都是全栈。能一门语言通吃三端，群众基础广泛，恐怕没有比Javascript/Typescript(Node.js)更合适的了。

服务端有Express、Koa、Feather、Nest、Meteor等各有其长的框架，前端大而火的Reactjs、Vuejs和Angular。因为公司的健康设备（血糖仪、血压计、体温计、血氧、体脂秤等等）会有专门的部门研发设计以及提供SDK，所以我们服务端的研发工作更多是在设计实现和性能优化上，React Native是一枚大杀器。

运维环境的选型上，我们所有的业务都运行在云端，省去了机房维护和服务器运维的成本。其实在盘古开荒时，我们也是编写了Node程序后，使用PM2部署在服务器上，并没有使用Docker。当然也存在没有使用Docker所带来的一切问题：三端不同步、环境无法隔离……而Docker带给我最大的惊喜除了超强的可移植性，更在于研发人员可以非常容易对程序的顶级架构进行推理。事实上，我们直接使用docker-compose做容器编排着实有一段时间，在一次大规模的服务器迁移中，我们发现需要重新思考越来越多的container管理和更完善的编排方案。Rancher（Cattle）就是在这时被应用到我们的技术栈中。


## 二、CI/CD，一切从Github开始

在运维环境选型一波三折的同时，我们持续集成（CI）与持续交付（CD）的流程也在迭代。从最初的代码拷贝，到结合docker-compose与rsync命令，到使用CI/CD工具……迄今为止，我们摸索出一套相对好用并且好玩的流程。主观上讲，当一只代码猴提交代码之后，他需要去接一杯咖啡。在猫屎氤氲的雾气里45°角仰望天花板，手机微信提醒这次构建成功（或失败，并附带污言秽语）。这时他可以开始往工位走，坐下时，微信又会提醒本次部署到Rancher成功（或失败）。

故事开始的地方是github。当我们的开发者写完 ~~BUG~~ 功能之后，需要有地方保存这些宝贵的资料。之所以没有使用Gitlab或Bitbucket搭建私有的Git服务器，是因为我们认为代码是我们最直接的价值所在。服务如骨架，终端如皮肤，UE如衣服，三者组成让人赏心悦目的风景，代码是这背后的基础。我们认为在团队精力无法更分散、人口规模尚小时，购买Github的商业版是稳妥且必要的，毕竟那帮人修复一次故障就像把网线拔下来再插上那样简单。


## 三、Drone CI

Drone这个单词在翻译中译作雄蜂、无人机。我特意咨询了一位精通一千零二十四国语言的英国朋友，说这个词的意思是autonomous，works by itself。白话就是有活它自己干，而且是自主的。不过这个解释对于Drone来说名副其实。这个在[Github][DroneGithub]上拥有13,000+ Stars的开源项目，使用Golang编写，相比Jenkins的大而全，Drone是为Docker而生的CI软件。如果有使用过Gitlab CI的小伙伴，相信对Drone的使用方式不会感到陌生，他们都是使用Yaml风格文件来定义pipeline：

```yaml
pipeline:
  backend:
    image: golang
    commands:
      - go build
      - go test
  frontend:
    image: node
    commands:
      - npm install
      - npm run test
      - npm run build
```
这是我们项目中摘选的一段.drone.yaml文件，意思是


Drone的安装方式如同Rancher一样简单，一行docker命令即可。当然，大家也可以看[Drone的官方文档][DroneDoc]，在这里，我们只讲一下使用Rancher Catlog安装Drone的方式：
![ImageDroneInstall](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-install.png)

查看大图大家可以看到Drone使用Rancher Catlog安装的方法（with github），在Github 的Settings中创建Drone的OAuth App时，Home Page Url务必要写你能访问Drone的IP地址或域名，例如：
> http://drone.company.com

而OAuth App的Authorization callback URL应该对应上面的写法：
> http://drone.company.com/authorize

小功告成：
![ImageDroneInstalled](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone_installed.png)


登录进Drone之后，在Repositories中找到你想要开启CI的Git Repo，用switch按钮打开它：

![ImageDroneSwitched](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-switch-repo.png)

这表示我们已经打开了Drone对于这个Repo的hook，当有代码提交时，Drone会检测这个Repo的根目录中是否包含.drone.yml文件，如果存在，则根据yaml文件定义的pipeline执行CI流程。

## 四、Drone与rancher、harbor、企业微信的集成

截止到上面的步骤，我们打开了Drone对于Github Repo的监听，需要再次注意的是，我们需要在代码repo的根目录包含.drone.yml文件，才会真正触发Drone的pipeline。

那么，如果我们想重现上面故事中的场景，应该如何进行集成呢？

我司在构建CI/CD的过程中，现使用Harbor作为私有镜像仓库，从程序猿提交代码到自动部署到Rancher，其实应当经历如下步骤：

- 提交代码，触发Github Webhook
- Drone使用docker插件，根据Dockerfile构建镜像，并推送到Harbor中
- Drone使用rancher插件，根据stack/service，部署上面构建好的image
- Drone使用企业微信插件，报告部署结果

在这里节选公司项目中的一段yaml代码，描述了上述步骤：
```yaml
# .drone.yaml

pipeline:
  # 使用plugins/docker插件，构建镜像，推送到harbor
  build_step:
    image: plugins/docker
    username: harbor_username
    password: harbor_password
    registry: harbor.company.com
    repo: harbor.company.com/registry/test
    mirror: 'https://registry.docker-cn.com'
    tag:
      - dev
    dockerfile: Dockerfile
    when:
      branch: develop
      event: push
  
  # 使用rancher插件，自动更新实例
  rancher:
    image: peloton/drone-rancher
    url: 'http://rancher.company.com/v2-beta/projects/1a870'
    access_key: rancher access key
    secret_key: rancher secret key
    service: rancher_stack/rancher_service
    docker_image: 'harbor.company.com/registry/test:dev'
    batch_size: 1
    timeout: 600
    confirm: true
    when:
      branch: develop
      event: push
      
  # 使用clem109/drone-wechat插件，报告到企业微信
  report-deploy:
    image: clem109/drone-wechat
    secrets:
      - plugin_corp_secret
      - plugin_corpid
      - plugin_agent_id
    title: '${DRONE_REPO_NAME}'
    description: |
      构建序列: ${DRONE_BUILD_NUMBER} 部署成功，干得好${DRONE_COMMIT_AUTHOR} ！
      更新内容: ${DRONE_COMMIT_MESSAGE}
    msg_url: 'http://project.company.com'
    btn_txt: 点击前往
    when:
      branch: develop
      status:
        - success
```

对接企业微信之前，需要在企业微信中新建自定义应用，比如我们的应用名字叫Drone CI/CD。当然，您也可以给每一个项目创建一个企业微信App，这样虽然麻烦，但是可以让需要关注该项目的人关注到构建信息。

下面是企业微信测试的截图：

![ImageDroneBuilded](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/workwechat-report.png)

在这里我认为有必要提醒一下，使用Drone的企业微信插件时，不要使用Drone Plugins列表里的企业微信。我翻阅过那个插件的源码，其中又一段会将企业的敏感信息发送至私人服务器。不管作者本身是出于BaaS的好意，还是其它想法，我认为都是不妥的：

![ImageDroneWrokwchatBadCode](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/bad-code.png)

代码地址：https://github.com/lizheming/drone-wechat/blob/master/index.js

在此之前很久，我的好友Clément 克雷蒙同学写了一个企业微信插件，至今仍在使用。欢迎检查源代码，提issue，star/fork统统欢迎：[clem109/drone-wechat][ToolsWorkWechat]


而在构建完成后，可以看到Drone控制面板里小伙伴们战斗过的痕迹：

![ImageDroneRecords](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-records.png)

## 五、ELK与Rancher的集成

ELK是ElasticSearch、Logstash与Kibana的集合，是一套非常强大的分布式日志方案。ELK的使用更多在于其本身的优化以及Kibana面向业务时的使用，这本身是一个很大的话题，只ElasticSearch就有许多奇技淫巧。

因为人力资源的原因，我们使用了兄弟部门搭建的ELK，所以在这里要做的事情就是把rancher中的日志归集到ELK中。

在rancher的catlog中找到logspout，这是一个logstash的adapter，为docker而生：

![ImageLogRun](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/logspout_logs.png)

我们在配置中设置LOGSPOUT=ignore，然后把ROUTE_URIS设置为我们已经搭建好的logstash地址，就可以将当前环境的日志集成到ELK中：

![ImageLogConf](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/logspout_config.png)


## 六、Traefik与Rancher的集成

目前看来一切都很好，对吗？的确是这样。我们提交了代码，drone自动构建镜像到harbor，自动部署到rancher，自动发送构建结果，rancher又可以帮我们自动重启死掉的container，使用rancher webhook也可以实现自动弹性计算，我们可以使用yaml文件定制我们的构建流程，我们可以定制一些report信息，当构建或部署失败时，让企业微信自动侮辱我们的小伙伴......

可是据说微服务还讲究服务注册和服务发现，我们并不想动用Zookeeper这样的核武器，况且目前我们并没有遇到需要削峰的处理。

对于域名的解析，我们选择使用[Traefik][Traefik]作为LB，这个同样使用Golang编写，同样拥有将近13,000 Stars，并且兼具简单的服务注册和服务发现功能。更值得一提的是，Rancher Catlog里的Traefik非常友好的集成了Let's Encrypt（ACME）的功能，可以做到自动申请SSL证书，过期自动续期。当然，不推荐在生产环境使用，SSL免费证书的数量非常容易达到阈值而使得域名无法访问。

如何安装Traefik呢？我们以Rancher Catlog中的Traefik为例（不使用ACME）：

![ImageTraefikConfig](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/traefik_config.png)

我们的目的是做域名解析，integration mode应该设置为metadata。Http Port设置为80，Https Port设置为443，Admin Port可以根据自己实际情况填写，默认8000。

此时的Traefik已经准备就绪，但是我们打开traefik_host:8000查看控制面板时，发现Traefik并没有做任何代理。原因是因为我们需要在代理的目标中，使用rancher labels标示出traefik的代理方式。

比如刚才我们安装的Drone，如果我们想代理到drone.company.com这个域名，则需要在drone server的container中设置lables：

![ImageTraefikProxy](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/traefik_proxy.png)

- traefik.enable=true 表示启用traefik代理
- traefik.domain=company.com 表示traefik代理的根域名
- traefik.port=8000 表示我们这个container对外暴露的端口
- traefik.alias=drone 表示我们想将drone server这个container解析为drone.company.com

需要注意的是，traefik.alias有可能重复，同时traefik有自己的一套默认解析规范。更详细的文档请看GitHub 地址：[rawmind0/alpine-traefik][rawmind0/alpine-traefik]

此时可以看到Traefik的控制面板中，已经注册了服务地址：

![ImageTraefikAdmin](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-admin.png)

利用Traefik的这个特性和Rancher对于Container的弹性计算，我们可以做到简单的服务注册和服务发现。

最后需要在域名服务商那里做A记录解析，解析的IP地址应为Traefik的公网地址。
因为域名解析的默认端口是80和443，后面发生的事情就和Nginx的作用一毛一样了。域名解析到Traefik服务器的80端口（https则是443），Traefik发现这个域名已经在我这里做了注册，于是代理到10.xx开头的虚拟IP，与Nginx Conf如出一辙：

![ImageTraefikDomain](https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/domain-proxy.png)

## 七、小技巧

Node.js的项目中书写Dockerfile时，我们经常会用到yarn或者npm i来拉取依赖包。但npm的服务器远在世界的另一端，我们可以使用淘宝的镜像进行加速：
```bash
FROM node:alpine
WORKDIR /app
COPY package.json .
RUN npm i --registry https://registry.npm.taobao.org
COPY . .
CMD [ "node", "bin/www" ]
```

Drone在构建镜像并推送到镜像仓库时，需要根据Dockerfile的基础镜像进行构建，而docker服务器也远在世界的另一端，我们可以使用mirror来指定镜像仓库，并尽量使用alpine镜像缩小体积：
```bash
pipeline:
  build_step:
    image: plugins/docker
    username: harbor_name
    password: harbor_pwd
    registry: harbor.company.com
    repo: harbor.company.com/repo/test
    mirror: 'https://registry.docker-cn.com'
```

作大死命令，不要在服务器上使用。但本地开发很好用。意思是停止所有container，删除所有container，删除所有image：
```bash
docker stop $(docker ps -aq) && docker rm $(docker ps -aq) && docker rmi $(docker images -aq)
```

## 八、总结，以及工具链汇总

罗马不是一天建成，万丈高楼平地起。在企业发展之处，我们在打基础的同时，也要保证项目的高速迭代。我们可以允许服务死掉，但是要保证服务能迅速的恢复过来。

在持续交付的过程中，我们也尝试加入sonar代码质量管理，以及phabricator代码review。但因我们尚未达到一个非常成熟可用的阶段，所以不再分享，仅作为印子来启发各位聪明的小伙伴，在DevOps的路上不但变得专业，也能变得有趣。

真正的天才，必须能够让事情变得简单。

Rancher: [rancher/rancher][ToolsRancher]

Drone: [drone/drone][ToolsDrone]

Drone企业微信API插件: [clem109/drone-wechat][ToolsWorkWechat]

Harbor: [vmware/harbor][ToolsHarbor]

Traefik: [containous/traefik][ToolsTraefik]

Phabricator: [phacility/phabricator][ToolsPhabricator]

SonarQube: [SonarSource/sonarqube][ToolsSonar]

Logspout: [gliderlabs/logspout][ToolsLogspout]

[DroneGithub]:https://github.com/drone/drone
[DroneDoc]:http://docs.drone.io
[Zheng]:https://mp.weixin.qq.com/s/vhpmqJVJpnqQkSdp2oGhOg

[ImageDroneInstall]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-install.png
[ImageDroneInstalled]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone_installed.png
[ImageDroneSwitched]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-switch-repo.png
[ImageDroneBuilded]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/workwechat-report.png
[ImageDroneWrokwchatBadCode]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/bad-code.png
[ImageDroneRecords]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-records.png

[ImageLogRun]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/logspout_logs.png
[ImageLogConf]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/logspout_config.png

[Traefik]:https://traefik.io
[ImageTraefikConfig]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/traefik_config.png
[ImageTraefikProxy]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/traefik_proxy.png
[rawmind0/alpine-traefik]:https://github.com/rawmind0/alpine-traefik
[ImageTraefikAdmin]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/drone-admin.png
[ImageTraefikDomain]:https://raw.githubusercontent.com/sirius1024/rancher-dev-demo/master/public/images/domain-proxy.png

[ToolsRancher]:https://github.com/rancher/rancher
[ToolsDrone]:https://github.com/drone/drone
[ToolsWorkWechat]:https://github.com/clem109/drone-wechat
[ToolsHarbor]:https://github.com/vmware/harbor
[ToolsTraefik]:https://github.com/containous/traefik
[ToolsPhabricator]:https://github.com/phacility/phabricator
[ToolsSonar]:https://github.com/SonarSource/sonarqube
[ToolsLogspout]:https://github.com/gliderlabs/logspout